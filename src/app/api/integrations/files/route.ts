import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth, verifyAuthToken } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { WaInbox } from '@/models/WaInbox';
import { verifyAndTouchIntegrationToken } from '@/lib/integrationToken';
import { checkIntegrationRateLimit, RATE_RULES } from '@/lib/integrationRateLimit';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
  integrationTokenId: z.string().optional(),
  cursor: z.string().optional()
});

function pickIntegrationToken(req: Request) {
  const h = req.headers.get('x-integration-token') ?? '';
  if (h.trim()) return h.trim();
  return '';
}

function pickUserToken(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

function asObjectId(value: unknown) {
  if (value instanceof Types.ObjectId) return value;
  const s = String(value ?? '').trim();
  return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
}

function decodeCursor(raw: string | undefined) {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { c?: string; i?: string };
    if (!parsed?.c || !parsed?.i || !Types.ObjectId.isValid(parsed.i)) return null;
    const dt = new Date(parsed.c);
    if (Number.isNaN(dt.getTime())) return null;
    return { createdAt: dt, _id: new Types.ObjectId(parsed.i) };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: Date, id: unknown) {
  const payload = JSON.stringify({ c: createdAt.toISOString(), i: String(id) });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const parsed = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const page = parsed.page;
    const limit = parsed.limit;
    const skip = (page - 1) * limit;
    const q = String(parsed.q ?? '').trim();
    const cursor = decodeCursor(parsed.cursor);

    const token = pickIntegrationToken(req);
    const userToken = pickUserToken(req);
    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';

    let tokenAccess: { tokenId: string; name: string } | null = null;
    if (token) {
      tokenAccess = await verifyAndTouchIntegrationToken(token, 'upload:create', ip);
      if (!tokenAccess) {
        return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`token:${tokenAccess.tokenId}`, RATE_RULES.LIST);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
    } else if (userToken) {
      try {
        await verifyAuthToken(userToken);
      } catch {
        return NextResponse.json({ error: 'Invalid user bearer token' }, { status: 401 });
      }
      const rl = checkIntegrationRateLimit(`user:${userToken.slice(0, 24)}`, RATE_RULES.LIST);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
      }
    } else {
      const me = await requireAuth();
      if (me.role !== 'admin' && me.role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const effectiveTokenId = String(parsed.integrationTokenId ?? '').trim();
    if (effectiveTokenId) {
      const waFilter: Record<string, unknown> = {
        'integration.tokenId': effectiveTokenId,
        'archive.archiveId': { $ne: null },
        status: { $ne: 'ignored' }
      };
      if (cursor) {
        waFilter.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }];
      }
      if (q) {
        const qFilter = [
          { originalName: { $regex: q, $options: 'i' } },
          { caption: { $regex: q, $options: 'i' } },
          { sourceName: { $regex: q, $options: 'i' } },
          { messageId: { $regex: q, $options: 'i' } }
        ];
        if (Array.isArray(waFilter.$or)) {
          waFilter.$and = [{ $or: waFilter.$or }, { $or: qFilter }];
          delete waFilter.$or;
        } else {
          waFilter.$or = qFilter;
        }
      }

      const [rows, total] = await Promise.all([
        WaInbox.find(waFilter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(cursor ? 0 : skip)
          .limit(limit)
          .select({ _id: 1, archive: 1, integration: 1, createdAt: 1, originalName: 1, mimeType: 1, size: 1 })
          .lean(),
        WaInbox.countDocuments(waFilter)
      ]);

      const orderedIds = rows
        .map((r) => asObjectId((r as { archive?: { archiveId?: unknown } }).archive?.archiveId))
        .filter((v): v is Types.ObjectId => Boolean(v));

      if (!orderedIds.length) {
        return NextResponse.json({
          success: true,
          data: [],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit), source: 'integration' }
        });
      }

      const docs = await Archive.find({ _id: { $in: orderedIds }, status: 'active' }).lean();
      const map = new Map(docs.map((d) => [String((d as { _id: unknown })._id), d]));
      const items = orderedIds
        .map((id) => map.get(String(id)))
        .filter(Boolean)
        .map((doc) => doc as Record<string, unknown>);

      return NextResponse.json({
        success: true,
        data: items,
        meta: {
          page: cursor ? undefined : page,
          limit,
          total,
          totalPages: cursor ? undefined : Math.ceil(total / limit),
          source: 'integration-filter',
          integrationTokenId: effectiveTokenId,
          nextCursor:
            rows.length === limit
              ? encodeCursor(
                  new Date(String((rows[rows.length - 1] as { createdAt: unknown }).createdAt)),
                  (rows[rows.length - 1] as { _id: unknown })._id
                )
              : null
        }
      });
    }

    const filter: Record<string, unknown> = { status: 'active' };
    if (cursor) {
      filter.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }];
    }
    if (q) {
      const qFilter = [
        { filename: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
        { docNumber: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { extractedText: { $regex: q, $options: 'i' } }
      ];
      filter.$or = qFilter;
    }

    const [items, total] = await Promise.all([
      Archive.find(filter).sort({ createdAt: -1, _id: -1 }).skip(cursor ? 0 : skip).limit(limit).lean(),
      Archive.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page: cursor ? undefined : page,
        limit,
        total,
        totalPages: cursor ? undefined : Math.ceil(total / limit),
        source: 'system-all-active',
        nextCursor:
          items.length === limit
            ? encodeCursor(
                new Date(String((items[items.length - 1] as { createdAt: unknown }).createdAt)),
                (items[items.length - 1] as { _id: unknown })._id
              )
            : null
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
