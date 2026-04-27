import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

export const runtime = 'nodejs';

const CreateUserSchema = z.object({
  nama: z.string().trim().min(1),
  nip: z.string().trim().min(3).max(40),
  golongan: z.string().trim().max(20).optional(),
  jabatan: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(5),
  password: z.string().trim().min(6),
  role: z.enum(['admin', 'staff', 'viewer']),
  unit: z.string().trim().max(100).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  address: z.string().trim().max(500).optional()
});

export async function GET() {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        _id: String(u._id),
        nama: (u as { nama?: string }).nama || u.name,
        nip: (u as { nip?: string }).nip ?? '',
        golongan: (u as { golongan?: string }).golongan ?? '',
        jabatan: (u as { jabatan?: string }).jabatan ?? '',
        phone: u.phone,
        role: u.role,
        unit: u.unit ?? null,
        email: u.email ?? null,
        gender: u.gender ?? null,
        address: u.address ?? null,
        createdAt: u.createdAt
      }))
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
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = CreateUserSchema.parse(await req.json());

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
        nip: (user as { nip?: string }).nip ?? '',
        golongan: (user as { golongan?: string }).golongan ?? '',
        jabatan: (user as { jabatan?: string }).jabatan ?? '',
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
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
