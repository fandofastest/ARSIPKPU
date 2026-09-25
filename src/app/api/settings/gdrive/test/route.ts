import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { testGoogleDriveConnection, GDriveResolvedConfig } from '@/lib/gdrive';

export const runtime = 'nodejs';

const TestSchema = z
  .object({
    enabled: z.boolean().optional(),
    authType: z.enum(['oauth', 'service_account']).default('oauth'),
    clientId: z.string().optional().default(''),
    clientSecret: z.string().optional().default(''),
    refreshToken: z.string().optional().default(''),
    folderId: z.string().optional().default(''),
    serviceAccountEmail: z.string().optional().default(''),
    privateKey: z.string().optional().default(''),
    shareMode: z.enum(['anyone', 'domain', 'private']).default('anyone'),
    shareDomain: z.string().optional().default('')
  })
  .optional();

export async function POST(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = TestSchema.parse(raw);

    const explicitConfig: GDriveResolvedConfig | undefined = body?.clientId || body?.serviceAccountEmail
      ? {
          enabled: true,
          authType: body.authType,
          clientId: (body.clientId || '').trim(),
          clientSecret: (body.clientSecret || '').trim(),
          refreshToken: (body.refreshToken || '').trim(),
          folderId: (body.folderId || '').trim(),
          serviceAccountEmail: (body.serviceAccountEmail || '').trim(),
          privateKey: (body.privateKey || '').trim(),
          shareMode: body.shareMode,
          shareDomain: (body.shareDomain || '').trim()
        }
      : undefined;

    const result = await testGoogleDriveConnection(explicitConfig);
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google Drive test failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
