import { NextResponse } from 'next/server';
import busboy from 'busboy';
import { Readable, Transform } from 'node:stream';
import { z } from 'zod';
import { Types } from 'mongoose';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { User } from '@/models/User';
import { WaInbox } from '@/models/WaInbox';
import { saveFileStream } from '@/lib/storage';
import { triggerOcrInBackground } from '@/lib/ocr';
import { shouldTriggerLocalOcr } from '@/lib/ocrExecution';
import { reserveArchiveNumbers } from '@/lib/archiveNumber';
import { applyPdfWatermarkByRelativePath } from '@/lib/pdfWatermark';
import { verifyAndTouchIntegrationToken } from '@/lib/integrationToken';
import { verifyAuthToken } from '@/lib/auth';
import { detectMimeFromSignature, isMimeCompatibleWithSignature } from '@/lib/fileSignature';
import { checkIntegrationRateLimit, RATE_RULES } from '@/lib/integrationRateLimit';
import { resolveActiveCategoryPath } from '@/lib/category';
import { buildStandardArchiveOriginalName } from '@/lib/archiveNaming';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? '104857600');
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

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
  status: z.enum(['processed', 'failed', 'ignored']).optional(),
  sourceType: z.enum(['group', 'dm', 'api', 'webhook']).optional(),
  integrationTokenId: z.string().optional()
});

function isMimeAllowed(mime: string) {
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function pickIntegrationToken(req: Request) {
  const generic = req.headers.get('x-integration-token') ?? '';
  if (generic.trim()) return generic.trim();
  return '';
}

function pickUserToken(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const token = pickIntegrationToken(req);
    const userToken = pickUserToken(req);
    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';

    let integrationAccess: { tokenId: string; name: string } | null = null;
    let userAccess: { userId: string; name: string; phone: string; role: string } | null = null;
    if (token) {
      integrationAccess = await verifyAndTouchIntegrationToken(token, 'upload:create', ip);
      if (!integrationAccess) {
        return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`token:${integrationAccess.tokenId}`, RATE_RULES.LIST);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
    } else if (userToken) {
      try {
        userAccess = await verifyAuthToken(userToken);
      } catch {
        return NextResponse.json({ error: 'Invalid user bearer token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`user:${userAccess.userId}`, RATE_RULES.LIST);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
    } else {
      const me = await requireAuth();
      if (me.role !== 'admin' && me.role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const parsed = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const page = parsed.page;
    const limit = parsed.limit;
    const skip = (page - 1) * limit;
    const q = String(parsed.q ?? '').trim();

    const filter: Record<string, unknown> = {};
    if (parsed.status) filter.status = parsed.status;
    if (parsed.sourceType) filter.sourceType = parsed.sourceType;
    if (integrationAccess) {
      filter['integration.tokenId'] = integrationAccess.tokenId;
    } else if (parsed.integrationTokenId?.trim()) {
      filter['integration.tokenId'] = parsed.integrationTokenId.trim();
    }
    if (q) {
      filter.$or = [
        { messageId: { $regex: q, $options: 'i' } },
        { sourceName: { $regex: q, $options: 'i' } },
        { sourceId: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
        { 'sender.phone': { $regex: q, $options: 'i' } },
        { 'sender.name': { $regex: q, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      WaInbox.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WaInbox.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        access: integrationAccess ? 'token' : userAccess ? 'user' : 'admin'
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const provided = pickIntegrationToken(req);
    const userToken = pickUserToken(req);
    await dbConnect();
    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';

    let verified: { tokenId: string; name: string; appType: 'app' | 'bot' } | null = null;
    if (provided) {
      verified = await verifyAndTouchIntegrationToken(provided, 'upload:create', ip);
      if (!verified) {
        return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`token:${verified.tokenId}`, RATE_RULES.UPLOAD);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
    }

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 415 });
    }

    const bb = busboy({
      headers: Object.fromEntries(req.headers.entries()),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 }
    });

    let messageId = '';
    let sourceType: 'group' | 'dm' | 'api' | 'webhook' = 'api';
    let sourceId = '';
    let sourceName = '';
    let senderPhone = '';
    let senderName = '';
    let caption = '';
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
    let uploaderPhoneInput = '';

    let savedInfo:
      | { relativePath: string; filename: string; safeOriginal: string; mimeType: string; size: number }
      | null = null;

    const savePromises: Promise<void>[] = [];
    const done = new Promise<void>((resolve, reject) => {
      bb.on('field', (name: string, value: string) => {
        if (name === 'messageId') messageId = String(value ?? '').trim().slice(0, 120);
        if (name === 'sourceType') {
          const src = String(value ?? '').trim();
          if (src === 'group' || src === 'dm' || src === 'api' || src === 'webhook') {
            sourceType = src;
          }
        }
        if (name === 'sourceId') sourceId = String(value ?? '').slice(0, 200);
        if (name === 'sourceName') sourceName = String(value ?? '').slice(0, 200);
        if (name === 'senderPhone') senderPhone = String(value ?? '').slice(0, 80);
        if (name === 'senderName') senderName = String(value ?? '').slice(0, 120);
        if (name === 'uploaderPhone') uploaderPhoneInput = String(value ?? '').slice(0, 80);
        if (name === 'caption' || name === 'description') caption = String(value ?? '').slice(0, 2000);
        if (name === 'docNumber') docNumber = String(value ?? '').slice(0, 200);
        if (name === 'unit') unit = String(value ?? '').slice(0, 100);
        if (name === 'docKind') docKind = String(value ?? '').slice(0, 100);
        if (name === 'unitSender') unitSender = String(value ?? '').slice(0, 100);
        if (name === 'unitRecipient') unitRecipient = String(value ?? '').slice(0, 100);
        if (name === 'title') title = String(value ?? '').slice(0, 300);
        if (name === 'subject') subject = String(value ?? '').slice(0, 300);
        if (name === 'category') category = String(value ?? '').slice(0, 100);
        if (name === 'classificationCode') classificationCode = String(value ?? '').slice(0, 50);
        if (name === 'year') {
          const raw = String(value ?? '').trim();
          year = raw ? (Number.isFinite(Number(raw)) ? Math.trunc(Number(raw)) : null) : null;
        }
        if (name === 'docDate') {
          const raw = String(value ?? '').trim();
          if (raw) {
            const d = new Date(raw);
            docDate = Number.isNaN(d.getTime()) ? null : d;
            docDateSource = 'user';
          }
        }
        if (name === 'private') {
          const v = String(value ?? '').toLowerCase();
          const priv = v === '1' || v === 'true' || v === 'yes' || v === 'on';
          isPublic = !priv;
        }
        if (name === 'tags') {
          tags = String(value ?? '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 50);
        }
      });

      bb.on('file', (name: string, file: unknown, info: { filename: string; encoding: string; mimeType: string }) => {
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

        (file as Readable).on('limit', () => reject(new Error('File too large')));
        const nodeReadable = file as Readable;
        let sniffed = Buffer.alloc(0);
        let mimeChecked = false;
        const inspector = new Transform({
          transform(chunk, _enc, cb) {
            if (!mimeChecked) {
              if (sniffed.length < 64) {
                const need = 64 - sniffed.length;
                sniffed = Buffer.concat([sniffed, chunk.subarray(0, Math.max(0, need))]);
              }
              const detected = detectMimeFromSignature(sniffed);
              if (detected && !isMimeCompatibleWithSignature(mimeType, detected)) {
                cb(new Error('Mime mismatch by signature'));
                return;
              }
              if (sniffed.length >= 16 || detected) mimeChecked = true;
            }
            cb(null, chunk);
          }
        });

        const p = saveFileStream(nodeReadable.pipe(inspector), info.filename, mimeType)
          .then(async (s) => {
            const watermarkedSize = mimeType === 'application/pdf' ? await applyPdfWatermarkByRelativePath(s.relativePath) : s.size;
            savedInfo = { ...s, size: watermarkedSize };
          })
          .catch((err: unknown) => reject(err instanceof Error ? err : new Error('Upload failed')));

        savePromises.push(p);
      });

      bb.on('error', (err: Error) => reject(err));
      bb.on('finish', () => resolve());
    });

    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    if (messageId) {
      const existing = await WaInbox.findOne({ messageId }).lean();
      if (existing) {
        return NextResponse.json({ success: true, data: existing, duplicate: true });
      }
    }

    Readable.fromWeb(body as never).pipe(bb);
    await done;
    if (savePromises.length) await Promise.all(savePromises);

    if (!savedInfo) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const fileSaved = savedInfo as {
      relativePath: string;
      filename: string;
      safeOriginal: string;
      mimeType: string;
      size: number;
    };
    let uploader: { userId: string; name: string; phone: string };
    if (verified?.appType === 'bot') {
      const normalizedUploaderPhone = uploaderPhoneInput.trim();
      if (!normalizedUploaderPhone) {
        return NextResponse.json({ error: 'uploaderPhone is required for bot app' }, { status: 400 });
      }
      const uploaderUser = await User.findOne({ phone: normalizedUploaderPhone })
        .select({ _id: 1, name: 1, phone: 1 })
        .lean();
      if (!uploaderUser) {
        return NextResponse.json({ error: 'Uploader phone not found' }, { status: 400 });
      }
      uploader = {
        userId: String(uploaderUser._id),
        name: String(uploaderUser.name ?? ''),
        phone: String(uploaderUser.phone ?? '')
      };
    } else {
      if (!userToken) {
        return NextResponse.json({ error: 'Missing user bearer token' }, { status: 401 });
      }
      let userPayload;
      try {
        userPayload = await verifyAuthToken(userToken);
      } catch {
        return NextResponse.json({ error: 'Invalid user bearer token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`user:${userPayload.userId}`, RATE_RULES.UPLOAD);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
      if (uploaderPhoneInput.trim() && uploaderPhoneInput.trim() !== userPayload.phone) {
        return NextResponse.json({ error: 'uploaderPhone must match user token phone' }, { status: 400 });
      }
      uploader = {
        userId: String(userPayload.userId),
        name: String(userPayload.name),
        phone: String(userPayload.phone)
      };
    }

    category = category.trim();
    classificationCode = (classificationCode || '').trim().toUpperCase() || 'UNCLASSIFIED';
    if (category) {
      const resolvedCategory = await resolveActiveCategoryPath(category);
      if (!resolvedCategory) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      category = resolvedCategory;
    }

    if (!unit.trim()) unit = unitSender.trim() || unitRecipient.trim();
    const assignedYear = (docDate ?? new Date()).getFullYear();
    const archiveNumbers = await reserveArchiveNumbers(assignedYear, 1);
    const finalDocKind = String(docKind ?? '').trim();
    const isAudioVideo = fileSaved.mimeType.startsWith('audio/') || fileSaved.mimeType.startsWith('video/');
    const standardizedOriginalName = buildStandardArchiveOriginalName({
      categoryPath: category,
      docKind: finalDocKind,
      docDate,
      docNumber,
      archiveNumber: archiveNumbers[0] || '',
      sourceNameWithExt: fileSaved.safeOriginal
    });

    const archive = await Archive.create({
      originalName: standardizedOriginalName,
      filename: fileSaved.filename,
      relativePath: fileSaved.relativePath,
      mimeType: fileSaved.mimeType,
      size: fileSaved.size,
      uploadedBy: {
        userId: new Types.ObjectId(uploader.userId),
        name: uploader.name,
        phone: uploader.phone
      },
      isPublic,
      visibility: isPublic ? 'public' : 'private',
      sharedWith: [],
      archiveNumber: archiveNumbers[0] || '',
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
      docNumber,
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
      description: caption,
      tags,
      status: 'active'
    });

    const waInbox = await WaInbox.create({
      messageId,
      sourceType,
      sourceId,
      sourceName,
      sender: { phone: senderPhone, name: senderName },
      caption,
      mimeType: fileSaved.mimeType,
      originalName: standardizedOriginalName,
      size: fileSaved.size,
      status: 'processed',
      error: '',
      notes: '',
      integration: {
        tokenId: verified?.tokenId ?? '',
        appName: verified?.name ?? ''
      },
      archive: {
        archiveId: archive._id,
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      },
      rawMeta: {
        hasCategory: Boolean(category),
        hasDocNumber: Boolean(docNumber),
        senderPhone
      }
    });

    if (!isAudioVideo && shouldTriggerLocalOcr()) {
      triggerOcrInBackground(3);
    }

    return NextResponse.json({ success: true, data: waInbox });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status =
      msg === 'UNAUTHORIZED'
        ? 401
        : msg === 'File too large'
          ? 413
          : msg === 'Mime mismatch by signature'
            ? 415
          : msg === 'Invalid mime type'
            ? 415
            : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
