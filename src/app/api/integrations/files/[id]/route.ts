import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { getFileStream } from '@/lib/storage';
import { verifyAndTouchIntegrationToken } from '@/lib/integrationToken';
import { logAudit } from '@/lib/audit';
import { checkIntegrationRateLimit, RATE_RULES } from '@/lib/integrationRateLimit';

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

function pickIntegrationToken(req: Request) {
  const h = req.headers.get('x-integration-token') ?? '';
  if (h.trim()) return h.trim();
  return '';
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = ctx.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const token = pickIntegrationToken(req);
    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';

    if (!token) {
      return NextResponse.json({ error: 'Missing integration token' }, { status: 401 });
    }

    const tokenAccess = await verifyAndTouchIntegrationToken(token, 'upload:create', ip);
    if (!tokenAccess) {
      return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
    }

    const rl = checkIntegrationRateLimit(`token:${tokenAccess.tokenId}`, RATE_RULES.DOWNLOAD || RATE_RULES.LIST);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
    }

    const archive = await Archive.findById(id).lean();
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Note: In integration context, we assume if they have the ID and a valid token, they can read it.
    // However, if we want to enforce visibility, we could check archive.isPublic or owner.
    // For now, let's keep it simple as requested.

    const { searchParams } = new URL(req.url);
    const inline = (searchParams.get('inline') ?? '').trim() === '1';

    await logAudit(inline ? 'preview' : 'download', {
      user: { userId: tokenAccess.tokenId, name: `App: ${tokenAccess.name}`, phone: 'integration', role: 'admin' } as any,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as any).archiveNumber ?? ''),
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
