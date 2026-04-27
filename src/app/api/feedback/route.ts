import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Feedback } from '@/models/Feedback';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const CreateSchema = z.object({
  category: z.enum(['kritik', 'saran', 'bug', 'fitur', 'lainnya']).default('saran'),
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(4000),
  rating: z.number().int().min(1).max(5).nullable().optional()
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['new', 'reviewed', 'resolved'])
});

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const status = String(searchParams.get('status') || '').trim();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Feedback.countDocuments(filter)
    ]);
    return NextResponse.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();
    const body = CreateSchema.parse(await req.json());

    const saved = await Feedback.create({
      category: body.category,
      subject: body.subject.trim(),
      message: body.message.trim(),
      rating: body.rating ?? null,
      status: 'new',
      submittedBy: {
        userId: me.userId,
        name: me.name,
        phone: me.phone,
        role: me.role
      }
    });

    await logAudit('update', {
      user: me,
      req,
      meta: { event: 'feedback_submit', feedbackId: String(saved._id), category: saved.category }
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const body = UpdateSchema.parse(await req.json());
    if (!Types.ObjectId.isValid(body.id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const updated = await Feedback.findByIdAndUpdate(
      body.id,
      {
        $set: {
          status: body.status,
          reviewedBy: { userId: me.userId, name: me.name, phone: me.phone },
          reviewedAt: new Date()
        }
      },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logAudit('update', {
      user: me,
      req,
      meta: { event: 'feedback_status_update', feedbackId: String(updated._id), status: updated.status }
    });

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
