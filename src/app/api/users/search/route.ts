import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get('q') ?? '').trim();
    const limit = Math.min(30, Math.max(1, Number(searchParams.get('limit') ?? '20')));

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { nama: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { nip: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select({ _id: 1, name: 1, nama: 1, phone: 1, nip: 1, role: 1 })
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        userId: String(u._id),
        name: String((u as { nama?: string }).nama || u.name || ''),
        phone: String(u.phone || ''),
        nip: String((u as { nip?: string }).nip || ''),
        role: String(u.role || '')
      }))
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
