import { NextResponse } from 'next/server';
import busboy from 'busboy';
import { Readable } from 'node:stream';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { saveFileStream } from '@/lib/storage';
import { triggerOcrInBackground } from '@/lib/ocr';
import { reserveArchiveNumbers } from '@/lib/archiveNumber';
import { logAudit } from '@/lib/audit';
import { applyPdfWatermarkByRelativePath } from '@/lib/pdfWatermark';
import { resolveActiveCategoryPath } from '@/lib/category';
import { buildStandardArchiveOriginalName } from '@/lib/archiveNaming';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? '104857600');
const MAX_FILES = Math.min(50, Math.max(1, Number(process.env.MAX_FILES ?? '20')));

const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
]);

function isMimeAllowed(mime: string) {
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 415 });
    }

    await dbConnect();

    const bb = busboy({
      headers: Object.fromEntries(req.headers.entries()),
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
    });

    let description = '';
    let type = '';
    let tags: string[] = [];
    let isPublic = true;
    let docNumber = '';
    let docDate: Date | null = null;
    let docDateSource: 'unknown' | 'default' | 'user' | 'ocr' = 'unknown';
    let unit = '';
    let docKind = '';
    let unitSender = '';
    let unitRecipient = '';
    let title = '';
    let subject = '';
    let year: number | null = null;
    let category = '';
    type SavedInfo = { relativePath: string; filename: string; safeOriginal: string; mimeType: string; size: number };
    type FileMeta = { originalName: string; mimeType: string; size: number };

    const files: { saved: SavedInfo; meta: FileMeta }[] = [];
    const savePromises: Promise<void>[] = [];

    const done = new Promise<void>((resolve, reject) => {
      bb.on('field', (name: string, value: string) => {
        if (name === 'description') description = String(value ?? '').slice(0, 2000);
        if (name === 'type') type = String(value ?? '').slice(0, 100);
        if (name === 'docNumber') docNumber = String(value ?? '').slice(0, 200);
        if (name === 'unit') unit = String(value ?? '').slice(0, 100);
        if (name === 'docKind') docKind = String(value ?? '').slice(0, 100);
        if (name === 'unitSender') unitSender = String(value ?? '').slice(0, 100);
        if (name === 'unitRecipient') unitRecipient = String(value ?? '').slice(0, 100);
        if (name === 'title') title = String(value ?? '').slice(0, 300);
        if (name === 'subject') subject = String(value ?? '').slice(0, 300);
        if (name === 'category') category = String(value ?? '').slice(0, 100);
        if (name === 'year') {
          const raw = String(value ?? '').trim();
          if (!raw) {
            year = null;
          } else {
            const n = Number(raw);
            year = Number.isFinite(n) ? Math.trunc(n) : null;
          }
        }
        if (name === 'docDate') {
          const s = value.trim();
          if (s) {
            const d = new Date(s);
            docDate = Number.isNaN(d.getTime()) ? null : d;
            docDateSource = 'user';
          }
        }

        if (name === 'docDateSource') {
          const s = value.trim();
          if (s === 'default' || s === 'user' || s === 'ocr' || s === 'unknown') {
            docDateSource = s;
          }
        }

        if (name === 'private') {
          const v = String(value ?? '').toLowerCase();
          const priv = v === '1' || v === 'true' || v === 'on' || v === 'yes';
          isPublic = !priv;
        }
        if (name === 'tags') {
          const raw = String(value ?? '');
          tags = raw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 50);
        }
      });

      bb.on(
        'file',
        (
          name: string,
          file: unknown,
          info: { filename: string; encoding: string; mimeType: string }
        ) => {
        if (name !== 'file') {
          (file as { resume?: () => void }).resume?.();
          return;
        }

        const mimeType = info.mimeType || 'application/octet-stream';
        if (!isMimeAllowed(mimeType)) {
          (file as { resume?: () => void }).resume?.();
          reject(new Error('Invalid mime type'));
          return;
        }

        (file as Readable).on('limit', () => {
          reject(new Error('File too large'));
        });

        const nodeReadable = file as Readable;

        const p = saveFileStream(nodeReadable, info.filename, mimeType)
          .then(async (s) => {
            const watermarkedSize =
              mimeType === 'application/pdf' ? await applyPdfWatermarkByRelativePath(s.relativePath) : s.size;
            files.push({ saved: s, meta: { originalName: s.safeOriginal, mimeType, size: watermarkedSize } });
          })
          .catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error('Upload failed'));
          });

        savePromises.push(p);
        }
      );

      bb.on('error', (err: Error) => reject(err));
      bb.on('finish', () => resolve());
    });

    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    Readable.fromWeb(body as never).pipe(bb);
    await done;

    if (savePromises.length) {
      await Promise.all(savePromises);
    }

    if (!files.length) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    category = category.trim();
    if (category) {
      const resolvedCategory = await resolveActiveCategoryPath(category);
      if (!resolvedCategory) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      category = resolvedCategory;
    }

    const finalDocKind = (docKind || type).trim();

    if (!unit.trim()) {
      unit = unitSender.trim() || unitRecipient.trim();
    }

    const assignedYear = (docDate ?? new Date()).getFullYear();
    const archiveNumbers = await reserveArchiveNumbers(assignedYear, files.length);

    const archives = await Archive.insertMany(
      files.map(({ saved: sv, meta: fm }, idx) => {
        const isAudioVideo = fm.mimeType.startsWith('audio/') || fm.mimeType.startsWith('video/');
        const archiveNumber = archiveNumbers[idx] || '';
        const resolvedDocNumber = files.length > 1 && docNumber.trim() ? `${docNumber.trim()}-${idx + 1}` : docNumber;
        const standardizedOriginalName = buildStandardArchiveOriginalName({
          categoryPath: category,
          docKind: finalDocKind,
          docDate,
          docNumber: resolvedDocNumber,
          archiveNumber,
          sourceNameWithExt: fm.originalName
        });
        return {
          originalName: standardizedOriginalName,
          filename: sv.filename,
          relativePath: sv.relativePath,
          mimeType: fm.mimeType,
          size: fm.size,
          uploadedBy: {
            userId: user.userId,
            name: user.name,
            phone: user.phone
          },
          isPublic,
          archiveNumber,
          docNumber: resolvedDocNumber,
          docDate,
          docDateSource,
          unit,
          type: finalDocKind,
          docKind: finalDocKind,
          unitSender,
          unitRecipient,
          title: title.trim() ? title.trim() : subject.trim(),
          subject,
          year,
          category,
          extractedText: '',
          ocrStatus: isAudioVideo ? 'done' : 'pending',
          ocrError: '',
          ocrUpdatedAt: isAudioVideo ? new Date() : null,
          description,
          tags,
          status: 'active'
        };
      }),
      { ordered: true }
    );

    const needsOcr = archives.some((a) => !(a.mimeType?.startsWith('audio/') || a.mimeType?.startsWith('video/')));
    if (needsOcr) {
      triggerOcrInBackground(3);
    }

    for (const a of archives) {
      await logAudit('upload', {
        user,
        req,
        archive: {
          archiveId: String(a._id),
          archiveNumber: (a as unknown as { archiveNumber?: string }).archiveNumber ?? '',
          originalName: a.originalName
        }
      });
    }

    return NextResponse.json({ success: true, data: archives, meta: { count: archives.length } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'File too large' ? 413 : msg === 'Invalid mime type' ? 415 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
