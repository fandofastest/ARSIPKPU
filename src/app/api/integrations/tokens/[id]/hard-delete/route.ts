import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { IntegrationToken } from '@/models/IntegrationToken';

export const runtime = 'nodejs';

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const token = await IntegrationToken.findById(id);
    if (!token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await token.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
