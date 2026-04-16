import { NextResponse } from 'next/server';

import { verifyAndTouchIntegrationToken } from '@/lib/integrationToken';
import { checkIntegrationRateLimit, RATE_RULES } from '@/lib/integrationRateLimit';

export const runtime = 'nodejs';

function pickIntegrationToken(req: Request) {
  const token = String(req.headers.get('x-integration-token') ?? '').trim();
  return token;
}

export async function GET(req: Request) {
  try {
    const token = pickIntegrationToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Missing integration token' }, { status: 401 });
    }

    const ip =
      (req.headers.get('x-forwarded-for') ?? '')
        .split(',')[0]
        ?.trim() || req.headers.get('x-real-ip') || '';
    const verified = await verifyAndTouchIntegrationToken(token, 'upload:create', ip);
    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized integration token' }, { status: 401 });
    }

    const rl = checkIntegrationRateLimit(`token:${verified.tokenId}`, RATE_RULES.LIST);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ok: true,
        app: { tokenId: verified.tokenId, name: verified.name, appType: verified.appType },
        scopes: ['upload:create'],
        serverTime: new Date().toISOString()
      }
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
