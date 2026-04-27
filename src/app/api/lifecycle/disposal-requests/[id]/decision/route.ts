import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { DisposalRequest } from '@/models/DisposalRequest';
import { executeApprovedDisposal } from '@/lib/lifecycleEngine';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional().default('')
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = BodySchema.parse(await req.json());

    const request = await DisposalRequest.findById(id);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.overallStatus !== 'pending') return NextResponse.json({ error: 'Request already closed' }, { status: 400 });

    const stages = ((request as unknown as { stages?: unknown[] }).stages || []) as Array<{
      order: number;
      role: string;
      status: 'pending' | 'approved' | 'rejected';
      decidedBy?: { userId?: string; name?: string; phone?: string };
      decidedAt?: Date | null;
      note?: string;
    }>;
    const current = stages.find((s) => s.status === 'pending');
    if (!current) return NextResponse.json({ error: 'No pending stage' }, { status: 400 });
    if (current.role !== me.role) return NextResponse.json({ error: 'Role not authorized for current stage' }, { status: 403 });

    const alreadyApprovedByMe = stages.some((s) => s.status === 'approved' && s.decidedBy?.userId === me.userId);
    if (alreadyApprovedByMe) {
      return NextResponse.json({ error: 'User cannot approve multiple stages' }, { status: 400 });
    }

    current.status = body.decision === 'approve' ? 'approved' : 'rejected';
    current.decidedBy = { userId: me.userId, name: me.name, phone: me.phone };
    current.decidedAt = new Date();
    current.note = body.note;

    if (body.decision === 'reject') {
      request.overallStatus = 'rejected';
    } else if (stages.every((s) => s.status === 'approved')) {
      request.overallStatus = 'approved';
    }

    await request.save();

    let disposalExecuted = null as null | { archiveId: string; requestId: string };
    if (request.overallStatus === 'approved') {
      disposalExecuted = await executeApprovedDisposal(String(request._id));
    }

    await logAudit('update', {
      user: me,
      req,
      archive: { archiveId: String(request.archiveId), archiveNumber: '', originalName: '' },
      meta: {
        event: 'disposal_request_decision',
        decision: body.decision,
        requestId: String(request._id),
        overallStatus: request.overallStatus,
        disposalExecuted: Boolean(disposalExecuted)
      }
    });

    return NextResponse.json({ success: true, data: request, meta: { disposalExecuted } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
