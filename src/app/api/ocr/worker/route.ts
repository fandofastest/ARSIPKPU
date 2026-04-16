import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { processPendingOcrBatch } from '@/lib/ocr';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    let limit = 5;
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.limit === 'number') {
        limit = Math.max(1, Math.min(20, Math.floor(body.limit)));
      }
    } catch {
      // ignore
    }

    const r = await processPendingOcrBatch(limit);

    return NextResponse.json({
      success: true,
      data: {
        picked: r.picked,
        processed: r.processed,
        failed: r.failed
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
