import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { GDriveSetting } from '@/models/GDriveSetting';
import { getGDriveConfig } from '@/lib/gdrive';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const UpdateSchema = z.object({
  enabled: z.boolean(),
  authType: z.enum(['oauth', 'service_account']).default('oauth'),
  clientId: z.string().optional().default(''),
  clientSecret: z.string().optional().default(''),
  refreshToken: z.string().optional().default(''),
  folderId: z.string().optional().default(''),
  serviceAccountEmail: z.string().optional().default(''),
  privateKey: z.string().optional().default(''),
  shareMode: z.enum(['anyone', 'domain', 'private']).default('anyone'),
  shareDomain: z.string().optional().default('')
});

export async function GET() {
  try {
    const me = await requireAuth();
    await dbConnect();

    const config = await getGDriveConfig();

    if (me.role !== 'admin') {
      return NextResponse.json({
        success: true,
        data: {
          enabled: config.enabled
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get GDrive settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = UpdateSchema.parse(await req.json());
    await dbConnect();

    const updated = await GDriveSetting.findOneAndUpdate(
      { singletonKey: 'default' },
      {
        $set: {
          enabled: body.enabled,
          authType: body.authType,
          clientId: body.clientId.trim(),
          clientSecret: body.clientSecret.trim(),
          refreshToken: body.refreshToken.trim(),
          folderId: body.folderId.trim(),
          serviceAccountEmail: body.serviceAccountEmail.trim(),
          privateKey: body.privateKey.trim(),
          shareMode: body.shareMode,
          shareDomain: body.shareDomain.trim(),
          updatedBy: {
            userId: me.userId,
            name: me.name || me.phone,
            phone: me.phone
          }
        }
      },
      { upsert: true, new: true }
    );

    await logAudit('update', {
      user: me,
      req,
      meta: {
        target: 'GDriveSetting',
        enabled: body.enabled,
        authType: body.authType,
        folderId: body.folderId
      }
    });

    const config = await getGDriveConfig();
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update GDrive settings';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
