import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { RetentionPolicy } from '@/models/RetentionPolicy';

export const runtime = 'nodejs';

const PolicySchema = z.object({
  classificationCode: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  activeRetentionYears: z.number().int().min(0).max(200),
  inactiveRetentionYears: z.number().int().min(0).max(200),
  terminalAction: z.enum(['permanent', 'disposed']),
  requireApproval: z.boolean().optional().default(true),
  approverRoles: z.array(z.enum(['admin', 'staff', 'viewer'])).min(1).max(10).optional().default(['admin', 'admin']),
  notifyBeforeDays: z.number().int().min(0).max(3650).optional().default(0),
  legalBasis: z.string().max(500).optional().default(''),
  enabled: z.boolean().optional().default(true)
});

export async function GET() {
  try {
    await requireAuth();
    await dbConnect();
    const items = await RetentionPolicy.find({}).sort({ classificationCode: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
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
    const body = PolicySchema.parse(await req.json());
    const classificationCode = body.classificationCode.trim().toUpperCase();
    const item = await RetentionPolicy.findOneAndUpdate(
      { classificationCode },
      {
        $set: {
          ...body,
          classificationCode,
          updatedBy: {
            userId: me.userId,
            name: me.name,
            phone: me.phone
          }
        }
      },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
