import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { DisposalRequest } from '@/models/DisposalRequest';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = String(searchParams.get('status') || '').trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')));
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const filter: Record<string, unknown> = {};
    if (status) filter.overallStatus = status;

    const [data, total] = await Promise.all([
      DisposalRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      DisposalRequest.countDocuments(filter)
    ]);
    return NextResponse.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
