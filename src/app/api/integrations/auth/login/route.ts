import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { dbConnect } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signAuthToken } from '@/lib/auth';
import { verifyAndTouchIntegrationToken } from '@/lib/integrationToken';
import { checkIntegrationRateLimit, RATE_RULES } from '@/lib/integrationRateLimit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  nip: z.string().min(3).max(40),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const appToken = String(req.headers.get('x-integration-token') ?? '').trim();
    if (!appToken) {
      return NextResponse.json({ error: 'Missing integration token' }, { status: 401 });
    }

    await dbConnect();
    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';
    const appAccess = await verifyAndTouchIntegrationToken(appToken, 'upload:create', ip);
    if (!appAccess) {
      return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
    }
    const rl = checkIntegrationRateLimit(`token:${appAccess.tokenId}`, RATE_RULES.LOGIN);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
    }
    if (appAccess.appType !== 'app') {
      return NextResponse.json({ error: 'Login is only allowed for app type' }, { status: 403 });
    }

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

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
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
          address: user.address ?? null
        }
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
