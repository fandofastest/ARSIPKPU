import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { AuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

    const action = (searchParams.get('action') ?? '').trim();
    const phone = (searchParams.get('phone') ?? '').trim();
    const archiveNumber = (searchParams.get('archiveNumber') ?? '').trim();
    const q = (searchParams.get('q') ?? '').trim();
    const from = (searchParams.get('from') ?? '').trim();
    const to = (searchParams.get('to') ?? '').trim();

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (phone) filter['user.phone'] = { $regex: phone, $options: 'i' };
    if (archiveNumber) filter['archive.archiveNumber'] = { $regex: archiveNumber, $options: 'i' };

    if (q) {
      filter.$or = [
        { 'user.name': { $regex: q, $options: 'i' } },
        { 'user.phone': { $regex: q, $options: 'i' } },
        { 'archive.archiveNumber': { $regex: q, $options: 'i' } },
        { 'archive.originalName': { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } }
      ];
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.$gte = new Date(from);
      if (to) createdAt.$lte = new Date(to);
      filter.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
