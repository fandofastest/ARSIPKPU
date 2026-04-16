import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { logAudit } from '@/lib/audit';
import { Category } from '@/models/Category';

export const runtime = 'nodejs';

function slugify(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().max(80).optional(),
  description: z.string().max(400).optional(),
  parentSlug: z.string().max(80).optional()
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin' && user.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = UpdateSchema.parse(await req.json());

    const current = await Category.findOne({ _id: id, status: 'active' });
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const nextName = body.name !== undefined ? body.name.trim() : current.name;
    const requestedParentSlug = body.parentSlug !== undefined ? slugify(body.parentSlug) : current.parentSlug;
    let parentSlug = requestedParentSlug;
    let parentPath = '';
    let parentLevel = -1;
    if (parentSlug) {
      const parent = await Category.findOne({ slug: parentSlug, status: 'active' }).select({ path: 1, level: 1 }).lean();
      if (!parent) return NextResponse.json({ error: 'Invalid parent category' }, { status: 400 });
      parentPath = String(parent.path ?? '').trim();
      parentLevel = Number(parent.level ?? -1);
    }

    const localSlug = body.slug !== undefined ? slugify(body.slug) : slugify(nextName);
    const nextSlug = parentSlug ? slugify(`${parentSlug}-${localSlug}`) : localSlug;
    const nextPath = parentPath ? `${parentPath} / ${nextName}` : nextName;
    const nextLevel = parentPath ? parentLevel + 1 : 0;

    const update: Record<string, unknown> = {
      name: nextName,
      slug: nextSlug,
      parentSlug,
      path: nextPath,
      level: nextLevel
    };
    if (body.description !== undefined) update.description = body.description.trim();

    const updated = await Category.findOneAndUpdate({ _id: id, status: 'active' }, { $set: update }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await logAudit('category_update', {
      user,
      req,
      meta: {
        categoryId: String(updated._id),
        categoryName: updated.name,
        categorySlug: updated.slug
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const isDup = typeof msg === 'string' && msg.toLowerCase().includes('duplicate');
    const status = msg === 'UNAUTHORIZED' ? 401 : isDup ? 409 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : isDup ? 'Slug already exists' : msg }, { status });
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const current = await Category.findOne({ _id: id, status: 'active' });
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (String(current.slug ?? '') === 'lainnya' || String(current.path ?? '').trim().toLowerCase() === 'lainnya') {
      return NextResponse.json({ error: 'Default category cannot be deactivated' }, { status: 400 });
    }

    current.status = 'deleted';
    await current.save();
    const updated = current;

    await logAudit('category_delete', {
      user,
      req,
      meta: {
        categoryId: String(updated._id),
        categoryName: updated.name,
        categorySlug: updated.slug
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
