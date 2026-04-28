import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { UploadSetting } from '@/models/UploadSetting';

export const runtime = 'nodejs';

const DefaultAllowedExtensions = [
  'pdf',
  'txt',
  'zip',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'tif',
  'tiff'
];

const UpdateSchema = z.object({
  maxFileSizeMb: z.number().int().min(1).max(2048),
  allowedExtensions: z.array(z.string()).max(200)
});

function normalizeAllowedExtensions(input: string[]) {
  const normalized = input
    .map((s) => String(s ?? ''))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith('.') ? s.slice(1) : s))
    .filter((s) => /^[a-z0-9]+$/.test(s));
  return Array.from(new Set(normalized));
}

function normalize(doc?: { maxFileSizeBytes?: number; allowedExtensions?: string[] } | null) {
  const envDefault = Number(process.env.MAX_FILE_SIZE ?? '104857600');
  const maxFileSizeBytes = Math.max(1, Number(doc?.maxFileSizeBytes ?? envDefault));
  const allowedExtensions = normalizeAllowedExtensions(doc?.allowedExtensions ?? DefaultAllowedExtensions);
  return {
    maxFileSizeMb: Math.max(1, Math.round(maxFileSizeBytes / (1024 * 1024))),
    allowedExtensions
  };
}

export async function GET() {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await dbConnect();
    const item = await UploadSetting.findOne({ singletonKey: 'default' }).lean();
    return NextResponse.json({ success: true, data: normalize(item as never) });
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
    const allowedExtensions = normalizeAllowedExtensions(body.allowedExtensions);
    if (!allowedExtensions.length) {
      return NextResponse.json({ error: 'allowedExtensions wajib diisi minimal 1' }, { status: 400 });
    }

    const maxFileSizeBytes = body.maxFileSizeMb * 1024 * 1024;

    await dbConnect();
    const updated = await UploadSetting.findOneAndUpdate(
      { singletonKey: 'default' },
      {
        $set: {
          singletonKey: 'default',
          maxFileSizeBytes,
          allowedExtensions,
          updatedBy: { userId: me.userId, name: me.name, phone: me.phone }
        }
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, data: normalize(updated as never) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

