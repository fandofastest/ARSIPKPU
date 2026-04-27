import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { deleteGoogleDriveFile, uploadArchiveFileToGoogleDrive } from '@/lib/gdrive';
import { logAudit } from '@/lib/audit';
import { canEditArchive } from '@/lib/archiveAccess';

export const runtime = 'nodejs';

const BodySchema = z
  .object({
    force: z.boolean().optional()
  })
  .optional();

export async function POST(req: Request, ctx: { params: { id: string } }) {
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

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const force = Boolean(body?.force);

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!canEditArchive(archive, me.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cachedUrl = String((archive as unknown as { gdriveLink?: string }).gdriveLink ?? '').trim();
    const cachedFileId = String((archive as unknown as { gdriveFileId?: string }).gdriveFileId ?? '').trim();
    if (cachedUrl && !force) {
      return NextResponse.json({
        success: true,
        data: {
          url: cachedUrl,
          fileId: cachedFileId || null,
          syncedAt: (archive as unknown as { gdriveSyncedAt?: Date | null }).gdriveSyncedAt ?? null,
          cached: true
        }
      });
    }

    const gdrive = await uploadArchiveFileToGoogleDrive({
      relativePath: archive.relativePath,
      originalName: archive.originalName,
      mimeType: archive.mimeType
    });

    (archive as unknown as { gdriveFileId?: string }).gdriveFileId = gdrive.fileId;
    (archive as unknown as { gdriveLink?: string }).gdriveLink = gdrive.webViewLink;
    (archive as unknown as { gdriveSyncedAt?: Date | null }).gdriveSyncedAt = new Date();
    (archive as unknown as { gdriveSyncError?: string }).gdriveSyncError = '';
    await archive.save();

    await logAudit('update', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      },
      meta: {
        event: 'gdrive_sync',
        gdriveFileId: gdrive.fileId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        url: gdrive.webViewLink,
        fileId: gdrive.fileId,
        syncedAt: (archive as unknown as { gdriveSyncedAt?: Date | null }).gdriveSyncedAt ?? null,
        cached: false
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : err instanceof z.ZodError ? 400 : 500;
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

    if (!canEditArchive(archive, me.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const oldFileId = String((archive as unknown as { gdriveFileId?: string }).gdriveFileId ?? '').trim();
    if (oldFileId) {
      await deleteGoogleDriveFile(oldFileId);
    }

    (archive as unknown as { gdriveFileId?: string }).gdriveFileId = '';
    (archive as unknown as { gdriveLink?: string }).gdriveLink = '';
    (archive as unknown as { gdriveSyncedAt?: Date | null }).gdriveSyncedAt = null;
    (archive as unknown as { gdriveSyncError?: string }).gdriveSyncError = '';
    await archive.save();

    await logAudit('update', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      },
      meta: { event: 'gdrive_unlink', gdriveFileId: oldFileId || null }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
