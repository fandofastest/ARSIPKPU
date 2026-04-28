import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const BodySchema = z.object({
  nip: z.string().min(3).max(40),
  password: z.string().min(1)
});

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

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    await dbConnect();

    const nip = body.nip.trim();
    const user = await User.findOne({ nip });
    if (!user) {
      return NextResponse.json({ error: 'Invalid NIP or password' }, { status: 401 });
    }

    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid NIP or password' }, { status: 401 });
    }

    const token = await signAuthToken({
      userId: String(user._id),
      name: (user as { nama?: string }).nama || user.name,
      phone: user.phone,
      role: user.role
    });

    setAuthCookie(token);

    await logAudit('login', {
      user: {
        userId: String(user._id),
        name: (user as { nama?: string }).nama || user.name,
        phone: user.phone,
        role: user.role
      },
      req
    });

    const missingProfileFields = getMissingProfileFields({
      name: user.name,
      nama: (user as { nama?: string }).nama,
      nip: (user as { nip?: string }).nip,
      golongan: (user as { golongan?: string }).golongan,
      jabatan: (user as { jabatan?: string }).jabatan,
      phone: user.phone,
      unit: user.unit ?? undefined,
      email: user.email ?? undefined,
      gender: user.gender ?? undefined,
      address: user.address ?? undefined
    });
    const profileComplete = missingProfileFields.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        _id: String(user._id),
        nama: (user as { nama?: string }).nama || user.name,
        nip: (user as { nip?: string }).nip ?? null,
        golongan: (user as { golongan?: string }).golongan ?? null,
        jabatan: (user as { jabatan?: string }).jabatan ?? null,
        phone: user.phone,
        role: user.role,
        unit: user.unit ?? null,
        email: user.email ?? null,
        gender: user.gender ?? null,
        address: user.address ?? null,
        createdAt: user.createdAt,
        profileComplete,
        missingProfileFields
      }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
