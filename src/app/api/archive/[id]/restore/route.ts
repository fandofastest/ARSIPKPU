import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { restoreFromTrash } from '@/lib/storage';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'deleted') {
      return NextResponse.json({ error: 'Trash item not found' }, { status: 404 });
    }

    const isOwner = String(archive.uploadedBy.userId) === me.userId;
    if (!isOwner && me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restoredPath = await restoreFromTrash(archive.relativePath, archive.originalName);
    archive.relativePath = restoredPath;
    archive.status = 'active';
    (archive as unknown as { trashedAt?: Date | null }).trashedAt = null;
    (archive as unknown as { trashedFromPath?: string }).trashedFromPath = '';
    await archive.save();

    await logAudit('update', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      },
      meta: { event: 'restore_from_trash' }
    });

    return NextResponse.json({ success: true, data: archive });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
