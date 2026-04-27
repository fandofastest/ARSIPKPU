import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { getTrashRetentionDays, purgeExpiredTrash } from '@/lib/trash';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();

    await purgeExpiredTrash();

    const parsed = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    const page = parsed.page;
    const limit = parsed.limit;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { status: 'deleted' };
    if (me.role === 'viewer') {
      filter['uploadedBy.userId'] = me.userId;
    }

    const [items, total] = await Promise.all([
      Archive.find(filter).sort({ trashedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Archive.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        retentionDays: getTrashRetentionDays()
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
