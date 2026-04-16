import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Category } from '@/models/Category';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: { id: string } }) {
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

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    category.status = 'active';
    await category.save();

    await logAudit('category_update', {
      user,
      req,
      meta: {
        action: 'reactivate',
        categoryId: String(category._id),
        categoryName: category.name,
        categorySlug: category.slug,
        status: category.status
      }
    });

    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
