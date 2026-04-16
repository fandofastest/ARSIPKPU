import { NextResponse } from 'next/server';
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

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().max(80).optional(),
  description: z.string().max(400).optional(),
  parentSlug: z.string().max(80).optional()
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const includeDeleted = (searchParams.get('includeDeleted') ?? '').trim() === '1';
    const status = (searchParams.get('status') ?? '').trim();

    const filter: Record<string, unknown> = {};
    if (includeDeleted && user.role === 'admin') {
      if (status === 'active' || status === 'deleted') filter.status = status;
    } else {
      filter.status = 'active';
    }

    const items = await Category.find(filter).sort({ status: 1, path: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin' && user.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const body = CreateSchema.parse(await req.json());

    const parentSlug = slugify(body.parentSlug ?? '');
    const parent = parentSlug
      ? await Category.findOne({ slug: parentSlug, status: 'active' }).select({ slug: 1, path: 1, level: 1 }).lean()
      : null;
    if (parentSlug && !parent) {
      return NextResponse.json({ error: 'Invalid parent category' }, { status: 400 });
    }

    const localSlug = slugify(body.slug?.trim() ? body.slug : body.name);
    const slug = parent ? slugify(`${parent.slug}-${localSlug}`) : localSlug;
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const path = parent ? `${String(parent.path ?? '').trim()} / ${body.name.trim()}` : body.name.trim();
    const level = parent ? Number(parent.level ?? 0) + 1 : 0;

    const payload = {
      name: body.name.trim(),
      slug,
      parentSlug: parent?.slug ?? '',
      path,
      level,
      description: (body.description ?? '').trim(),
      createdBy: { userId: user.userId, name: user.name, phone: user.phone },
      status: 'active'
    };
    const existing = await Category.findOne({ slug }).select({ _id: 1 }).lean();

    let created;
    if (existing) {
      await Category.updateOne({ _id: existing._id }, { $set: payload });
      created = await Category.findById(existing._id);
      if (!created) {
        return NextResponse.json({ error: 'Failed to save category' }, { status: 500 });
      }
    } else {
      created = await Category.create(payload);
    }

    await logAudit('category_create', {
      user,
      req,
      meta: {
        categoryId: String(created._id),
        categoryName: created.name,
        categorySlug: created.slug,
        status: created.status
      }
    });

    return NextResponse.json({ success: true, data: created });
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
