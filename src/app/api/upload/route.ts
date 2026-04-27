import { NextResponse } from 'next/server';
import busboy from 'busboy';
import { Readable } from 'node:stream';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { deleteFile, saveFileStream, sha256ByRelativePath } from '@/lib/storage';
import { triggerOcrInBackground } from '@/lib/ocr';
import { shouldTriggerLocalOcr } from '@/lib/ocrExecution';
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

type PerFileOverride = {
  index: number;
  title?: string;
  docNumber?: string;
  docDate?: string;
  docKind?: string;
  category?: string;
  description?: string;
  tags?: string;
  visibility?: 'inherit' | 'public' | 'private';
};

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
    let classificationCode = 'UNCLASSIFIED';
    let perFileOverridesRaw = '';
    const perFileOverridesByIndex = new Map<number, PerFileOverride>();
    type SavedInfo = {
      relativePath: string;
      filename: string;
      safeOriginal: string;
      mimeType: string;
      size: number;
      uploadIndex: number;
    };
    type FileMeta = { originalName: string; mimeType: string; size: number };

    const files: { saved: SavedInfo; meta: FileMeta }[] = [];
    const savePromises: Promise<void>[] = [];
    let uploadIndexCounter = 0;

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
        if (name === 'classificationCode') classificationCode = String(value ?? '').slice(0, 50);
        if (name === 'perFileOverrides') perFileOverridesRaw = String(value ?? '');
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
        const uploadIndex = uploadIndexCounter;
        uploadIndexCounter += 1;

        const p = saveFileStream(nodeReadable, info.filename, mimeType)
          .then(async (s) => {
            const watermarkedSize =
              mimeType === 'application/pdf' ? await applyPdfWatermarkByRelativePath(s.relativePath) : s.size;
            files.push({ saved: { ...s, uploadIndex }, meta: { originalName: s.safeOriginal, mimeType, size: watermarkedSize } });
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

    if (perFileOverridesRaw.trim()) {
      try {
        const parsed = JSON.parse(perFileOverridesRaw) as unknown;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item || typeof item !== 'object') continue;
            const row = item as Record<string, unknown>;
            const idx = Number(row.index);
            if (!Number.isFinite(idx) || idx < 0) continue;
            perFileOverridesByIndex.set(Math.trunc(idx), {
              index: Math.trunc(idx),
              title: typeof row.title === 'string' ? row.title : undefined,
              docNumber: typeof row.docNumber === 'string' ? row.docNumber : undefined,
              docDate: typeof row.docDate === 'string' ? row.docDate : undefined,
              docKind: typeof row.docKind === 'string' ? row.docKind : undefined,
              category: typeof row.category === 'string' ? row.category : undefined,
              description: typeof row.description === 'string' ? row.description : undefined,
              tags: typeof row.tags === 'string' ? row.tags : undefined,
              visibility:
                row.visibility === 'public' || row.visibility === 'private' || row.visibility === 'inherit'
                  ? row.visibility
                  : undefined
            });
          }
        }
      } catch {
        return NextResponse.json({ error: 'Invalid per-file overrides format' }, { status: 400 });
      }
    }

    const prepared = await Promise.all(
      files.map(async ({ saved, meta }) => {
        const checksumSha256 = await sha256ByRelativePath(saved.relativePath);
        return { saved, meta, checksumSha256 };
      })
    );

    const checksumSet = Array.from(new Set(prepared.map((x) => x.checksumSha256).filter(Boolean)));
    const existingDupes = checksumSet.length
      ? await Archive.find({
          status: 'active',
          checksumSha256: { $in: checksumSet }
        })
          .select({ _id: 1, originalName: 1, archiveNumber: 1, checksumSha256: 1 })
          .lean()
      : [];
    const dupeEntries: Array<[string, (typeof existingDupes)[number]]> = [];
    for (const d of existingDupes) {
      const key = String((d as { checksumSha256?: string }).checksumSha256 ?? '').trim();
      if (!key) continue;
      dupeEntries.push([key, d]);
    }
    const dupeMap = new Map<string, (typeof existingDupes)[number]>(dupeEntries);

    const uniquePrepared: Array<(typeof prepared)[number]> = [];
    const duplicates: Array<{
      uploadedName: string;
      duplicateOf: { id: string; originalName: string; archiveNumber?: string };
      checksumSha256: string;
    }> = [];

    for (const p of prepared) {
      const found = dupeMap.get(p.checksumSha256);
      if (!found) {
        uniquePrepared.push(p);
        continue;
      }
      await deleteFile(p.saved.relativePath).catch(() => {
        // ignore
      });
      duplicates.push({
        uploadedName: p.meta.originalName,
        duplicateOf: {
          id: String((found as { _id: unknown })._id),
          originalName: String((found as { originalName?: string }).originalName ?? ''),
          archiveNumber: String((found as { archiveNumber?: string }).archiveNumber ?? '')
        },
        checksumSha256: p.checksumSha256
      });
    }

    if (!uniquePrepared.length) {
      return NextResponse.json(
        {
          error: 'All uploaded files are duplicates',
          duplicates
        },
        { status: 409 }
      );
    }

    category = category.trim();
    classificationCode = (classificationCode || '').trim().toUpperCase() || 'UNCLASSIFIED';
    const resolvedCategoryCache = new Map<string, string>();
    if (category) {
      const resolvedCategory = await resolveActiveCategoryPath(category);
      if (!resolvedCategory) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      category = resolvedCategory;
      resolvedCategoryCache.set(category.toLowerCase(), category);
    }

    const finalDocKind = (docKind || type).trim();

    if (!unit.trim()) {
      unit = unitSender.trim() || unitRecipient.trim();
    }

    const assignedYear = (docDate ?? new Date()).getFullYear();
    const archiveNumbers = await reserveArchiveNumbers(assignedYear, uniquePrepared.length);

    const rows = await Promise.all(
      uniquePrepared.map(async ({ saved: sv, meta: fm, checksumSha256 }, idx) => {
        const override = perFileOverridesByIndex.get(sv.uploadIndex);
        const overrideDocDateRaw = override?.docDate?.trim() || '';
        const overrideDocDate = overrideDocDateRaw ? new Date(overrideDocDateRaw) : null;
        const finalDocDate = overrideDocDate && !Number.isNaN(overrideDocDate.getTime()) ? overrideDocDate : docDate;
        const finalDocDateSource =
          overrideDocDate && !Number.isNaN(overrideDocDate.getTime())
            ? 'user'
            : docDateSource;
        const overrideDocNumber = override?.docNumber?.trim() || '';
        const finalDocNumber = overrideDocNumber || docNumber;
        const resolvedDocNumber = uniquePrepared.length > 1 && !overrideDocNumber && finalDocNumber.trim()
          ? `${finalDocNumber.trim()}-${idx + 1}`
          : finalDocNumber;
        const overrideDocKind = override?.docKind?.trim() || '';
        const finalDocKindPerFile = (overrideDocKind || finalDocKind).trim();
        const overrideTitle = override?.title?.trim() || '';
        const overrideCategory = override?.category?.trim() || '';
        let finalCategory = category;
        if (overrideCategory) {
          const key = overrideCategory.toLowerCase();
          let resolved = resolvedCategoryCache.get(key);
          if (!resolved) {
            const resolvedPath = await resolveActiveCategoryPath(overrideCategory);
            if (!resolvedPath) {
              throw new Error(`Invalid category override for file: ${fm.originalName}`);
            }
            resolved = resolvedPath;
            resolvedCategoryCache.set(key, resolved);
          }
          finalCategory = resolved;
        }
        const overrideDescription = override?.description?.trim();
        const finalDescription = overrideDescription ? overrideDescription.slice(0, 2000) : description;
        const overrideTagsRaw = override?.tags?.trim() || '';
        const finalTags = overrideTagsRaw
          ? overrideTagsRaw
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 50)
          : tags;
        const finalIsPublic =
          override?.visibility === 'private' ? false : override?.visibility === 'public' ? true : isPublic;
        const archiveNumber = archiveNumbers[idx] || '';
        const standardizedOriginalName = buildStandardArchiveOriginalName({
          categoryPath: finalCategory,
          docKind: finalDocKindPerFile,
          docDate: finalDocDate,
          docNumber: resolvedDocNumber,
          archiveNumber,
          sourceNameWithExt: fm.originalName
        });
        const isAudioVideo = fm.mimeType.startsWith('audio/') || fm.mimeType.startsWith('video/');
        return {
          originalName: standardizedOriginalName,
          filename: sv.filename,
          relativePath: sv.relativePath,
          mimeType: fm.mimeType,
          size: fm.size,
          checksumSha256,
          uploadedBy: {
            userId: user.userId,
            name: user.name,
            phone: user.phone
          },
          isPublic: finalIsPublic,
          visibility: finalIsPublic ? 'public' : 'private',
          sharedWith: [],
          archiveNumber,
          classificationCode,
          lifecycleState: 'ACTIVE',
          storageTier: 'hot',
          lifecycleStateChangedAt: new Date(),
          retentionPolicyCode: '',
          retentionActiveUntil: null,
          retentionInactiveUntil: null,
          retentionReviewedAt: null,
          disposalEligibleAt: null,
          disposalNotifiedAt: null,
          dispositionAt: null,
          docNumber: resolvedDocNumber,
          docDate: finalDocDate,
          docDateSource: finalDocDateSource,
          unit,
          type: finalDocKindPerFile,
          docKind: finalDocKindPerFile,
          unitSender,
          unitRecipient,
          title: overrideTitle || title.trim() || subject.trim(),
          subject,
          year,
          category: finalCategory,
          extractedText: '',
          ocrStatus: isAudioVideo ? 'done' : 'pending',
          ocrError: '',
          ocrUpdatedAt: isAudioVideo ? new Date() : null,
          description: finalDescription,
          tags: finalTags,
          status: 'active' as const
        };
      })
    );

    const archives = await Archive.insertMany(rows, { ordered: true });

    const needsOcr = archives.some((a) => !(a.mimeType?.startsWith('audio/') || a.mimeType?.startsWith('video/')));
    if (needsOcr && shouldTriggerLocalOcr()) {
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

    return NextResponse.json({
      success: true,
      data: archives,
      meta: {
        count: archives.length,
        duplicatesSkipped: duplicates.length
      },
      duplicates
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'File too large' ? 413 : msg === 'Invalid mime type' ? 415 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
