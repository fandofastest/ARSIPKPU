import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { RetentionPolicy } from '@/models/RetentionPolicy';

export const runtime = 'nodejs';

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  activeRetentionYears: z.number().int().min(0).max(200).optional(),
  inactiveRetentionYears: z.number().int().min(0).max(200).optional(),
  terminalAction: z.enum(['permanent', 'disposed']).optional(),
  requireApproval: z.boolean().optional(),
  approverRoles: z.array(z.enum(['admin', 'staff', 'viewer'])).min(1).max(10).optional(),
  notifyBeforeDays: z.number().int().min(0).max(3650).optional(),
  legalBasis: z.string().max(500).optional(),
  enabled: z.boolean().optional()
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = UpdateSchema.parse(await req.json());

    const updated = await RetentionPolicy.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body,
          updatedBy: { userId: me.userId, name: me.name, phone: me.phone }
        }
      },
      { new: true }
    );
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
