import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { LifecycleNotification } from '@/models/LifecycleNotification';

export const runtime = 'nodejs';

const ReadBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500)
});

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const unreadOnly = String(searchParams.get('unreadOnly') || '1') === '1';
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')));

    const baseFilter: Record<string, unknown> = {
      $or: [{ forRoles: me.role }, { forRoles: 'admin' }]
    };

    const items = await LifecycleNotification.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean();
    const data = items.filter((n) => {
      const readBy = ((n as unknown as { readBy?: Array<{ userId?: string }> }).readBy || []).map((x) => x.userId);
      const isRead = readBy.includes(me.userId);
      return unreadOnly ? !isRead : true;
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();
    const body = ReadBodySchema.parse(await req.json());

    await LifecycleNotification.updateMany(
      { _id: { $in: body.ids } },
      {
        $addToSet: {
          readBy: { userId: me.userId, at: new Date() }
        }
      }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
