import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    const me = await requireAuth();
    await dbConnect();
    const user = await User.findById(me.userId).select({ nama: 1, nip: 1, golongan: 1, jabatan: 1, unit: 1, email: 1, gender: 1, address: 1 }).lean();
    return NextResponse.json({
      success: true,
      data: {
        ...me,
        nama: (user as { nama?: string } | null)?.nama ?? me.name,
        nip: (user as { nip?: string } | null)?.nip ?? null,
        golongan: (user as { golongan?: string } | null)?.golongan ?? null,
        jabatan: (user as { jabatan?: string } | null)?.jabatan ?? null,
        unit: user?.unit ?? null,
        email: user?.email ?? null,
        gender: user?.gender ?? null,
        address: user?.address ?? null
      }
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
