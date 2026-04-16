import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';

export const runtime = 'nodejs';

const UpdateUserSchema = z.object({
  nama: z.string().min(1).optional(),
  nip: z.string().min(3).max(40).optional(),
  golongan: z.string().max(20).optional().nullable(),
  jabatan: z.string().max(120).optional().nullable(),
  phone: z.string().min(5).optional(),
  role: z.enum(['admin', 'staff', 'viewer']).optional(),
  unit: z.string().max(100).optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  address: z.string().max(500).optional().nullable(),
  password: z.string().min(6).optional()
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = UpdateUserSchema.parse(await req.json());

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (body.phone && body.phone !== user.phone) {
      const exists = await User.findOne({ phone: body.phone }).lean();
      if (exists) {
        return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
      }
    }
    const nipNormalized = body.nip === undefined ? undefined : body.nip.trim();
    if (nipNormalized !== undefined && nipNormalized !== ((user as { nip?: string }).nip ?? '')) {
      const existsNip = await User.findOne({ nip: nipNormalized, _id: { $ne: user._id } }).lean();
      if (existsNip) {
        return NextResponse.json({ error: 'NIP already registered' }, { status: 409 });
      }
    }
    const emailNormalized = body.email === undefined ? undefined : body.email.trim().toLowerCase();
    if (emailNormalized !== undefined && emailNormalized !== (user.email ?? '')) {
      if (emailNormalized) {
        const existsEmail = await User.findOne({ email: emailNormalized, _id: { $ne: user._id } }).lean();
        if (existsEmail) {
          return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }
      }
    }

    if (body.nama !== undefined) {
      (user as { nama?: string }).nama = body.nama.trim();
      user.name = body.nama.trim();
    }
    if (nipNormalized !== undefined) (user as { nip?: string }).nip = nipNormalized || undefined;
    if (body.golongan !== undefined) (user as { golongan?: string }).golongan = body.golongan?.trim() || undefined;
    if (body.jabatan !== undefined) (user as { jabatan?: string }).jabatan = body.jabatan?.trim() || undefined;
    if (body.phone !== undefined) user.phone = body.phone;
    if (emailNormalized !== undefined) user.email = emailNormalized || undefined;
    if (body.gender !== undefined) user.gender = body.gender || undefined;
    if (body.address !== undefined) user.address = body.address?.trim() || undefined;
    if (body.role !== undefined) user.role = body.role;
    if (body.unit !== undefined) user.unit = body.unit ?? undefined;
    if (body.password !== undefined) user.password = await bcrypt.hash(body.password, 12);

    await user.save();

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

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    if (id === me.userId) {
      return NextResponse.json({ error: 'Cannot delete current user' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await user.deleteOne();

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
