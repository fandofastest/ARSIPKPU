import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const BodySchema = z.object({
  phone: z.string().min(5),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    await dbConnect();

    const user = await User.findOne({ phone: body.phone });
    if (!user) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    }

    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
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
