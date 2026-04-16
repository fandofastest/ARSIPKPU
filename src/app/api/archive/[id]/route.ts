import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { getFileStream, moveToTrash } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { resolveActiveCategoryPath } from '@/lib/category';
import { buildStandardArchiveOriginalName } from '@/lib/archiveNaming';

export const runtime = 'nodejs';

function contentDispositionFilename(originalName: string) {
  const fallback = originalName.replace(/[\r\n"]/g, '_');
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function contentDispositionInlineFilename(originalName: string) {
  const fallback = originalName.replace(/[\r\n"]/g, '_');
  const encoded = encodeURIComponent(originalName);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

const UpdateBodySchema = z.object({
  type: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(50).optional(),
  isPublic: z.boolean().optional(),
  docNumber: z.string().max(200).optional(),
  unit: z.string().max(100).optional(),
  docDate: z.union([z.string(), z.null()]).optional(),
  docDateSource: z.enum(['unknown', 'default', 'user', 'ocr']).optional(),
  docKind: z.string().max(100).optional(),
  unitSender: z.string().max(100).optional(),
  unitRecipient: z.string().max(100).optional(),
  title: z.string().max(300).optional(),
  subject: z.string().max(300).optional(),
  year: z.union([z.number().int(), z.null()]).optional(),
  category: z.string().max(100).optional()
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (user.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = UpdateBodySchema.parse(await req.json());

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (String(archive.uploadedBy.userId) !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.type !== undefined) archive.type = body.type;
    if (body.description !== undefined) archive.description = body.description;
    if (body.tags !== undefined) archive.tags = body.tags;
    if (body.isPublic !== undefined) archive.isPublic = body.isPublic;
    if (body.docNumber !== undefined) archive.docNumber = body.docNumber;
    if (body.unit !== undefined) archive.unit = body.unit;
    if (body.docKind !== undefined) archive.docKind = body.docKind;
    if (body.unitSender !== undefined) archive.unitSender = body.unitSender;
    if (body.unitRecipient !== undefined) archive.unitRecipient = body.unitRecipient;
    if (body.title !== undefined) archive.title = body.title;
    if (body.subject !== undefined) archive.subject = body.subject;
    if (body.year !== undefined) archive.year = body.year;
    if (body.category !== undefined) {
      const inputCategory = String(body.category ?? '').trim();
      if (!inputCategory) {
        archive.category = '';
      } else {
        const resolvedCategory = await resolveActiveCategoryPath(inputCategory);
        if (!resolvedCategory) {
          return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        archive.category = resolvedCategory;
      }
    }
    if (body.docDate !== undefined) {
      if (body.docDate === null || String(body.docDate).trim() === '') {
        archive.docDate = null;
      } else {
        const d = new Date(body.docDate);
        archive.docDate = Number.isNaN(d.getTime()) ? null : d;
      }
      (archive as unknown as { docDateSource?: string }).docDateSource = 'user';
    }

    if (body.docDateSource !== undefined) {
      (archive as unknown as { docDateSource?: string }).docDateSource = body.docDateSource;
    }

    const nextKind = String((archive.docKind || archive.type || '')).trim();
    if (nextKind) {
      archive.docKind = nextKind;
      archive.type = nextKind;
    }

    archive.originalName = buildStandardArchiveOriginalName({
      categoryPath: String(archive.category ?? ''),
      docKind: String(archive.docKind || archive.type || ''),
      docDate: archive.docDate,
      docNumber: String(archive.docNumber ?? ''),
      archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
      sourceNameWithExt: archive.originalName
    });

    await archive.save();

    await logAudit('update', {
      user,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      }
    });
    return NextResponse.json({ success: true, data: archive });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const archive = await Archive.findById(id).lean();
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = String(archive.uploadedBy.userId) === me.userId;
    if (!archive.isPublic && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const inline = (searchParams.get('inline') ?? '').trim() === '1';

    await logAudit(inline ? 'preview' : 'download', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      }
    });

    const lowerName = String(archive.originalName ?? '').toLowerCase();
    const contentType =
      lowerName.endsWith('.pdf') || archive.mimeType === 'application/pdf'
        ? 'application/pdf'
        : archive.mimeType;

    const stream = getFileStream(archive.relativePath);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': inline
          ? contentDispositionInlineFilename(archive.originalName)
          : contentDispositionFilename(archive.originalName)
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (String(archive.uploadedBy.userId) !== me.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newPath = await moveToTrash(archive.relativePath);
    archive.relativePath = newPath;
    archive.status = 'deleted';
    await archive.save();

    await logAudit('delete', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
