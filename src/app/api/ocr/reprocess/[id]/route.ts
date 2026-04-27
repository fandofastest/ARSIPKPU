import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { triggerOcrInBackground } from '@/lib/ocr';
import { shouldTriggerLocalOcr } from '@/lib/ocrExecution';

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

    const archive = await Archive.findById(id);
    if (!archive || archive.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    archive.ocrStatus = 'pending';
    archive.ocrError = '';
    archive.extractedText = '';
    archive.ocrUpdatedAt = new Date();
    await archive.save();

    if (shouldTriggerLocalOcr()) {
      triggerOcrInBackground(1);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
