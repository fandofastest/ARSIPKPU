import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { BackupSetting } from '@/models/BackupSetting';

export const runtime = 'nodejs';

const UpdateSchema = z.object({
  enabled: z.boolean(),
  cron: z.string().min(5).max(100),
  keepLast: z.number().int().min(1).max(365),
  backupBaseDir: z.string().min(1).max(260),
  projectDir: z.string().min(1).max(260),
  envFile: z.string().min(1).max(260),
  offsiteRemote: z.string().max(260).optional().default('')
});

function normalize(doc?: {
  enabled?: boolean;
  cron?: string;
  keepLast?: number;
  backupBaseDir?: string;
  projectDir?: string;
  envFile?: string;
  offsiteRemote?: string;
}) {
  return {
    enabled: doc?.enabled ?? false,
    cron: doc?.cron ?? '30 1 * * *',
    keepLast: doc?.keepLast ?? 14,
    backupBaseDir: doc?.backupBaseDir ?? '/home/fando/arsipkpu/backups',
    projectDir: doc?.projectDir ?? '/home/fando/arsipkpu',
    envFile: doc?.envFile ?? '/home/fando/arsipkpu/.env.docker',
    offsiteRemote: doc?.offsiteRemote ?? ''
  };
}

function toNormalizedInput(doc: {
  enabled?: boolean;
  cron?: string;
  keepLast?: number;
  backupBaseDir?: string;
  projectDir?: string;
  envFile?: string;
  offsiteRemote?: string;
} | null) {
  if (!doc) return undefined;
  return {
    enabled: doc.enabled,
    cron: doc.cron,
    keepLast: doc.keepLast,
    backupBaseDir: doc.backupBaseDir,
    projectDir: doc.projectDir,
    envFile: doc.envFile,
    offsiteRemote: doc.offsiteRemote
  };
}

export async function GET() {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await dbConnect();

    const item = await BackupSetting.findOne({ singletonKey: 'default' });
    return NextResponse.json({ success: true, data: normalize(toNormalizedInput(item)) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
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

    const updated = await BackupSetting.findOneAndUpdate(
      { singletonKey: 'default' },
      {
        $set: {
          singletonKey: 'default',
          enabled: body.enabled,
          cron: body.cron.trim(),
          keepLast: body.keepLast,
          backupBaseDir: body.backupBaseDir.trim(),
          projectDir: body.projectDir.trim(),
          envFile: body.envFile.trim(),
          offsiteRemote: (body.offsiteRemote || '').trim(),
          updatedBy: { userId: me.userId, name: me.name, phone: me.phone }
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: normalize(toNormalizedInput(updated)) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
