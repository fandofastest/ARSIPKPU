import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { IntegrationToken } from '@/models/IntegrationToken';
import {
  formatIntegrationToken,
  generateIntegrationTokenSecret,
  hashIntegrationTokenSecret,
  maskIntegrationToken
} from '@/lib/integrationToken';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['active', 'revoked']).optional(),
  q: z.string().optional()
});

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  appType: z.enum(['app', 'bot']).default('app'),
  scope: z.array(z.string().min(1).max(80)).min(1).max(10).default(['upload:create']),
  expiresAt: z.string().datetime().optional().nullable()
});

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const parsed = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const page = parsed.page;
    const limit = parsed.limit;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (parsed.status) filter.status = parsed.status;
    const q = String(parsed.q ?? '').trim();
    if (q) filter.name = { $regex: q, $options: 'i' };

    const [items, total] = await Promise.all([
      IntegrationToken.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({ tokenHash: 0 })
        .lean(),
      IntegrationToken.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const body = CreateSchema.parse(await req.json());
    const secret = generateIntegrationTokenSecret();
    const tokenDoc = await IntegrationToken.create({
      name: body.name.trim(),
      appType: body.appType,
      tokenHash: hashIntegrationTokenSecret(secret),
      status: 'active',
      scope: body.scope.map((s) => s.trim()).filter(Boolean),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: { userId: me.userId, name: me.name, phone: me.phone }
    });

    const plainToken = formatIntegrationToken(String(tokenDoc._id), secret);

    return NextResponse.json({
      success: true,
      data: {
        ...tokenDoc.toObject(),
        token: plainToken,
        tokenMasked: maskIntegrationToken(plainToken)
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
