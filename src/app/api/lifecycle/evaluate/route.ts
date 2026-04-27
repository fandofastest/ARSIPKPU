import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { runLifecycleAutomation } from '@/lib/lifecycleEngine';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  limit: z.number().int().min(1).max(5000).optional().default(500)
});

function hasWorkerAuth(req: Request) {
  const token = req.headers.get('x-lifecycle-token') || '';
  const expected = process.env.LIFECYCLE_WORKER_TOKEN || '';
  return Boolean(expected && token && token === expected);
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    let actor:
      | {
          userId: string;
          name: string;
          phone: string;
          role: 'admin' | 'staff' | 'viewer';
        }
      | null = null;

    if (hasWorkerAuth(req)) {
      actor = { userId: 'system', name: 'Lifecycle Worker', phone: '-', role: 'admin' };
    } else {
      const me = await requireAuth();
      if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      actor = me;
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const result = await runLifecycleAutomation(body.limit);

    await logAudit('update', {
      user: actor,
      req,
      meta: { event: 'lifecycle_evaluate', ...result }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
