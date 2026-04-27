import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { User } from '@/models/User';
import { isArchiveOwner, normalizeVisibility } from '@/lib/archiveAccess';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ShareBodySchema = z.object({
  visibility: z.enum(['public', 'private', 'shared']),
  sharedWith: z
    .array(
      z.object({
        userId: z.string().min(1),
        role: z.enum(['viewer', 'editor']).default('viewer')
      })
    )
    .max(200)
    .optional()
    .default([])
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const archive = await Archive.findById(id).lean();
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = isArchiveOwner(archive, me.userId);
    if (!isOwner && me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const visibility = normalizeVisibility(archive);
    const sharedWith = Array.isArray((archive as { sharedWith?: unknown[] }).sharedWith)
      ? ((archive as { sharedWith?: Array<{ userId?: unknown; name?: unknown; phone?: unknown; role?: unknown }> }).sharedWith || [])
          .map((m) => ({
            userId: String(m.userId ?? ''),
            name: String(m.name ?? ''),
            phone: String(m.phone ?? ''),
            role: m.role === 'editor' ? 'editor' : 'viewer'
          }))
          .filter((m) => m.userId)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        visibility,
        sharedWith
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    await dbConnect();

    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = isArchiveOwner(archive, me.userId);
    if (!isOwner && me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = ShareBodySchema.parse(await req.json());
    const rawMembers = body.sharedWith || [];
    const ownerUserId = String(archive.uploadedBy?.userId ?? '');

    const uniquePairs = new Map<string, 'viewer' | 'editor'>();
    for (const item of rawMembers) {
      if (!Types.ObjectId.isValid(item.userId)) continue;
      if (item.userId === me.userId) continue;
      if (ownerUserId && item.userId === ownerUserId) continue;
      const prev = uniquePairs.get(item.userId);
      if (prev === 'editor') continue;
      uniquePairs.set(item.userId, item.role === 'editor' ? 'editor' : 'viewer');
    }

    const userIds = Array.from(uniquePairs.keys());
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select({ _id: 1, name: 1, phone: 1 }).lean() : [];
    const byId = new Map(users.map((u) => [String(u._id), u]));

    if (byId.size !== userIds.length) {
      return NextResponse.json({ error: 'Some shared users are invalid' }, { status: 400 });
    }

    const sharedWith = userIds.map((userId) => {
      const u = byId.get(userId) as { name?: string; phone?: string };
      return {
        userId,
        name: String(u.name ?? ''),
        phone: String(u.phone ?? ''),
        role: uniquePairs.get(userId) === 'editor' ? 'editor' : 'viewer'
      };
    });

    if (body.visibility === 'shared' && sharedWith.length === 0) {
      return NextResponse.json({ error: 'Shared visibility requires at least one user' }, { status: 400 });
    }

    (archive as unknown as { visibility?: string }).visibility = body.visibility;
    archive.isPublic = body.visibility === 'public';
    (archive as unknown as { sharedWith?: unknown[] }).sharedWith = body.visibility === 'shared' ? sharedWith : [];
    await archive.save();

    await logAudit('update', {
      user: me,
      req,
      archive: {
        archiveId: String(archive._id),
        archiveNumber: String((archive as unknown as { archiveNumber?: string }).archiveNumber ?? ''),
        originalName: archive.originalName
      },
      meta: {
        event: 'archive_share_update',
        visibility: body.visibility,
        sharedCount: sharedWith.length
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        visibility: body.visibility,
        sharedWith: sharedWith.map((m) => ({
          userId: String(m.userId),
          name: m.name,
          phone: m.phone,
          role: m.role
        }))
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
