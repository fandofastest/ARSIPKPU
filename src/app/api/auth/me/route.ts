import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

function getMissingProfileFields(user: {
  name?: string;
  nama?: string;
  nip?: string;
  golongan?: string;
  jabatan?: string;
  phone?: string;
  unit?: string;
  email?: string;
  gender?: string;
  address?: string;
}) {
  const missing: string[] = [];
  const nama = String(user.nama || user.name || '').trim();
  const nip = String(user.nip || '').trim();
  const golongan = String(user.golongan || '').trim();
  const jabatan = String(user.jabatan || '').trim();
  const phone = String(user.phone || '').trim();
  const unit = String(user.unit || '').trim();
  const email = String(user.email || '').trim();
  const gender = String(user.gender || '').trim();
  const address = String(user.address || '').trim();

  if (!nama) missing.push('nama');
  if (!nip) missing.push('nip');
  if (!golongan) missing.push('golongan');
  if (!jabatan) missing.push('jabatan');
  if (!phone) missing.push('phone');
  if (!unit) missing.push('unit');
  if (!email) missing.push('email');
  if (!gender) missing.push('gender');
  if (!address) missing.push('address');

  return missing;
}

export async function GET() {
  try {
    const me = await requireAuth();
    await dbConnect();
    const user = await User.findById(me.userId)
      .select({ name: 1, nama: 1, nip: 1, golongan: 1, jabatan: 1, phone: 1, unit: 1, email: 1, gender: 1, address: 1 })
      .lean();

    const missingProfileFields = getMissingProfileFields({
      name: (user as { name?: string } | null)?.name ?? me.name,
      nama: (user as { nama?: string } | null)?.nama ?? me.name,
      nip: (user as { nip?: string } | null)?.nip ?? undefined,
      golongan: (user as { golongan?: string } | null)?.golongan ?? undefined,
      jabatan: (user as { jabatan?: string } | null)?.jabatan ?? undefined,
      phone: (user as { phone?: string } | null)?.phone ?? me.phone,
      unit: (user as { unit?: string } | null)?.unit ?? undefined,
      email: (user as { email?: string } | null)?.email ?? undefined,
      gender: (user as { gender?: string } | null)?.gender ?? undefined,
      address: (user as { address?: string } | null)?.address ?? undefined
    });
    const profileComplete = missingProfileFields.length === 0;

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
        address: user?.address ?? null,
        profileComplete,
        missingProfileFields
      }
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
