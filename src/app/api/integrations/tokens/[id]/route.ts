import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
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

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  appType: z.enum(['app', 'bot']).optional(),
  scope: z.array(z.string().min(1).max(80)).min(1).max(10).optional(),
  status: z.enum(['active', 'revoked']).optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

const RotateSchema = z.object({
  rotate: z.literal(true)
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const rawBody = await req.json();
    const rotateParsed = RotateSchema.safeParse(rawBody);
    if (rotateParsed.success) {
      const secret = generateIntegrationTokenSecret();
      const updated = await IntegrationToken.findByIdAndUpdate(
        id,
        {
          $set: {
            tokenHash: hashIntegrationTokenSecret(secret),
            status: 'active',
            lastUsedAt: null,
            lastUsedIp: ''
          }
        },
        { new: true }
      );
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const plainToken = formatIntegrationToken(String(updated._id), secret);
      return NextResponse.json({
        success: true,
        data: {
          ...updated.toObject(),
          token: plainToken,
          tokenMasked: maskIntegrationToken(plainToken)
        }
      });
    }

    const body = UpdateSchema.parse(rawBody);
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.appType !== undefined) update.appType = body.appType;
    if (body.scope !== undefined) update.scope = body.scope.map((s) => s.trim()).filter(Boolean);
    if (body.status !== undefined) update.status = body.status;
    if (body.expiresAt !== undefined) update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const updated = await IntegrationToken.findByIdAndUpdate(id, { $set: update }, { new: true }).select({ tokenHash: 0 });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const updated = await IntegrationToken.findByIdAndUpdate(id, { $set: { status: 'revoked' } }, { new: true }).select({ tokenHash: 0 });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
