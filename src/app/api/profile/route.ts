import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { requireAuth, setAuthCookie, signAuthToken } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

export const runtime = 'nodejs';

const UpdateSchema = z
  .object({
    nama: z.string().min(2).max(120).optional(),
    nip: z.string().min(3).max(40).optional(),
    golongan: z.string().max(20).optional().nullable(),
    jabatan: z.string().max(120).optional().nullable(),
    unit: z.string().max(100).optional().nullable(),
    email: z.union([z.string().email(), z.literal('')]).optional(),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    address: z.string().max(500).optional().nullable(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(6).optional()
  })
  .superRefine((val, ctx) => {
    if (val.newPassword && !val.currentPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current password is required to change password', path: ['currentPassword'] });
    }
  });

export async function GET() {
  try {
    const me = await requireAuth();
    await dbConnect();
    const user = await User.findById(me.userId).select({ name: 1, nama: 1, nip: 1, golongan: 1, jabatan: 1, phone: 1, role: 1, unit: 1, email: 1, gender: 1, address: 1, createdAt: 1 }).lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    await dbConnect();

    const user = await User.findById(me.userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const emailNormalized = body.email === undefined ? undefined : body.email.trim().toLowerCase();
    if (emailNormalized !== undefined && emailNormalized !== (user.email ?? '')) {
      if (emailNormalized) {
        const exists = await User.findOne({ email: emailNormalized, _id: { $ne: user._id } }).lean();
        if (exists) {
          return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }
      }
      user.email = emailNormalized || undefined;
    }

    if (body.nip !== undefined) {
      const nipNormalized = body.nip.trim();
      if (nipNormalized !== ((user as { nip?: string }).nip ?? '')) {
        const existsNip = await User.findOne({ nip: nipNormalized, _id: { $ne: user._id } }).lean();
        if (existsNip) {
          return NextResponse.json({ error: 'NIP already registered' }, { status: 409 });
        }
      }
      (user as { nip?: string }).nip = nipNormalized || undefined;
    }

    if (body.newPassword) {
      const ok = await bcrypt.compare(String(body.currentPassword ?? ''), user.password);
      if (!ok) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      user.password = await bcrypt.hash(body.newPassword, 12);
    }

    if (body.nama !== undefined) {
      (user as { nama?: string }).nama = body.nama.trim();
      user.name = body.nama.trim();
    }
    if (body.golongan !== undefined) (user as { golongan?: string }).golongan = body.golongan?.trim() || undefined;
    if (body.jabatan !== undefined) (user as { jabatan?: string }).jabatan = body.jabatan?.trim() || undefined;
    if (body.unit !== undefined) user.unit = body.unit?.trim() || undefined;
    if (body.gender !== undefined) user.gender = body.gender || undefined;
    if (body.address !== undefined) user.address = body.address?.trim() || undefined;
    await user.save();

    const token = await signAuthToken({
      userId: String(user._id),
      name: (user as { nama?: string }).nama || user.name,
      phone: user.phone,
      role: user.role
    });
    setAuthCookie(token);

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
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
