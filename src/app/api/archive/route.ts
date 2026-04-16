import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { triggerOcrInBackground } from '@/lib/ocr';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();

    triggerOcrInBackground(1);

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const q = (searchParams.get('q') ?? '').trim();
    const uploaderPhone = (searchParams.get('uploader') ?? '').trim();
    const type = (searchParams.get('type') ?? '').trim();
    const tag = (searchParams.get('tag') ?? '').trim();
    const from = (searchParams.get('from') ?? '').trim();
    const to = (searchParams.get('to') ?? '').trim();
    const docNumber = (searchParams.get('docNumber') ?? '').trim();
    const unit = (searchParams.get('unit') ?? '').trim();
    const docFrom = (searchParams.get('docFrom') ?? '').trim();
    const docTo = (searchParams.get('docTo') ?? '').trim();
    const docKind = (searchParams.get('docKind') ?? '').trim();
    const unitSender = (searchParams.get('unitSender') ?? '').trim();
    const unitRecipient = (searchParams.get('unitRecipient') ?? '').trim();
    const title = (searchParams.get('title') ?? '').trim();
    const category = (searchParams.get('category') ?? '').trim();
    const year = (searchParams.get('year') ?? '').trim();

    const and: Record<string, unknown>[] = [
      { $or: [{ isPublic: true }, { 'uploadedBy.userId': me.userId }] }
    ];

    const filter: Record<string, unknown> = { status: 'active', $and: and };

    if (q) {
      filter.$text = { $search: q };
    }

    if (uploaderPhone) {
      filter['uploadedBy.phone'] = uploaderPhone;
    }

    if (type) {
      filter.type = type;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (docNumber) {
      filter.docNumber = { $regex: docNumber, $options: 'i' };
    }

    if (unit) {
      filter.unit = { $regex: unit, $options: 'i' };
    }

    if (docKind) {
      filter.docKind = { $regex: docKind, $options: 'i' };
    }

    if (unitSender) {
      filter.unitSender = { $regex: unitSender, $options: 'i' };
    }

    if (unitRecipient) {
      filter.unitRecipient = { $regex: unitRecipient, $options: 'i' };
    }

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    if (year) {
      const n = Number(year);
      if (Number.isFinite(n)) {
        filter.year = Math.trunc(n);
      }
    }

    if (docFrom || docTo) {
      const docDate: Record<string, Date> = {};
      if (docFrom) docDate.$gte = new Date(docFrom);
      if (docTo) docDate.$lte = new Date(docTo);
      filter.docDate = docDate;
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.$gte = new Date(from);
      if (to) createdAt.$lte = new Date(to);
      filter.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const regexFallbackOr = q
      ? {
          $or: [
            { filename: { $regex: q, $options: 'i' } },
            { originalName: { $regex: q, $options: 'i' } },
            { docNumber: { $regex: q, $options: 'i' } },
            { title: { $regex: q, $options: 'i' } },
            { extractedText: { $regex: q, $options: 'i' } }
          ]
        }
      : null;

    let items: unknown[] = [];
    let total = 0;

    if (q) {
      try {
        [items, total] = await Promise.all([
          Archive.find(filter)
            .sort({ score: { $meta: 'textScore' } } as never)
            .skip(skip)
            .limit(limit)
            .lean(),
          Archive.countDocuments(filter)
        ]);
      } catch {
        items = [];
        total = 0;
      }

      if (items.length === 0) {
        delete filter.$text;
        if (regexFallbackOr) {
          and.push(regexFallbackOr as never);
        }

        [items, total] = await Promise.all([
          Archive.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          Archive.countDocuments(filter)
        ]);
      }
    } else {
      [items, total] = await Promise.all([
        Archive.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Archive.countDocuments(filter)
      ]);
    }

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
