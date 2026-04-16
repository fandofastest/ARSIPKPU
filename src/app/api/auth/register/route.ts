import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

const BodySchema = z.object({
  nama: z.string().min(1),
  nip: z.string().min(3).max(40),
  golongan: z.string().max(20).optional(),
  jabatan: z.string().max(120).optional(),
  phone: z.string().min(5),
  password: z.string().min(6),
  role: z.enum(['admin', 'staff', 'viewer']),
  unit: z.string().max(100).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  address: z.string().max(500).optional()
});

export async function POST(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = BodySchema.parse(await req.json());

    await dbConnect();

    const exists = await User.findOne({ phone: body.phone }).lean();
    if (exists) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
    }
    const emailNormalized = body.email?.trim().toLowerCase() || '';
    if (emailNormalized) {
      const existsEmail = await User.findOne({ email: emailNormalized }).lean();
      if (existsEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }
    const nipNormalized = body.nip.trim();
    const existsNip = await User.findOne({ nip: nipNormalized }).lean();
    if (existsNip) {
      return NextResponse.json({ error: 'NIP already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await User.create({
      nama: body.nama.trim(),
      name: body.nama.trim(),
      nip: nipNormalized,
      golongan: body.golongan?.trim() || undefined,
      jabatan: body.jabatan?.trim() || undefined,
      phone: body.phone,
      email: emailNormalized || undefined,
      gender: body.gender || undefined,
      address: body.address?.trim() || undefined,
      password: passwordHash,
      role: body.role,
      unit: body.unit
    });

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
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
