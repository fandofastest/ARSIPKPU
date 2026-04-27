import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { logAudit } from '@/lib/audit';
import { buildReadAccessOrFilter, normalizeVisibility } from '@/lib/archiveAccess';

export const runtime = 'nodejs';

function esc(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function toDateString(d: unknown) {
  const dt = d ? new Date(String(d)) : null;
  if (!dt || Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function buildExcelHtml(rows: Record<string, unknown>[]) {
  const header = [
    'No. Arsip',
    'Nama File',
    'Judul Dokumen',
    'Nomor Surat',
    'Tanggal Surat',
    'Jenis Dokumen',
    'Kategori',
    'Unit Pengirim',
    'Unit Penerima',
    'Public',
    'Uploader',
    'Phone',
    'Created At',
    'OCR Status'
  ];

  const th = header.map((h) => `<th>${esc(h)}</th>`).join('');

  const tr = rows
    .map((it) => {
      const cells = [
        esc(it.archiveNumber),
        esc(it.originalName),
        esc((it as { title?: string; subject?: string }).title || (it as { subject?: string }).subject),
        esc(it.docNumber),
        esc(it.docDate ? toDateString(it.docDate) : ''),
        esc((it as { docKind?: string; type?: string }).docKind || (it as { type?: string }).type),
        esc(it.category),
        esc(it.unitSender),
        esc(it.unitRecipient),
        esc(normalizeVisibility(it as { visibility?: string; isPublic?: boolean }) === 'public' ? '1' : '0'),
        esc((it as { uploadedBy?: { name?: string } }).uploadedBy?.name),
        esc((it as { uploadedBy?: { phone?: string } }).uploadedBy?.phone),
        esc(toDateString(it.createdAt)),
        esc(it.ocrStatus)
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
</head>
<body>
<table border="1">
<thead><tr>${th}</tr></thead>
<tbody>${tr}</tbody>
</table>
</body>
</html>`;
}

export async function GET(req: Request) {
  try {
    const me = await requireAuth();
    await dbConnect();

    const { searchParams } = new URL(req.url);

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

    const and: Record<string, unknown>[] = [{ $or: buildReadAccessOrFilter(me.userId) }];
    const filter: Record<string, unknown> = { status: 'active', $and: and };

    if (q) filter.$text = { $search: q };
    if (uploaderPhone) filter['uploadedBy.phone'] = uploaderPhone;
    if (type) filter.type = type;
    if (tag) filter.tags = tag;
    if (docNumber) filter.docNumber = { $regex: docNumber, $options: 'i' };
    if (unit) filter.unit = { $regex: unit, $options: 'i' };
    if (docKind) filter.docKind = { $regex: docKind, $options: 'i' };
    if (unitSender) filter.unitSender = { $regex: unitSender, $options: 'i' };
    if (unitRecipient) filter.unitRecipient = { $regex: unitRecipient, $options: 'i' };
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };

    if (year) {
      const n = Number(year);
      if (Number.isFinite(n)) filter.year = Math.trunc(n);
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

    const limit = Math.min(10000, Math.max(1, Number(searchParams.get('limit') ?? '5000')));

    let items: unknown[] = [];
    if (q) {
      try {
        items = await Archive.find(filter)
          .sort({ score: { $meta: 'textScore' } } as never)
          .limit(limit)
          .lean();
      } catch {
        items = [];
      }

      if (items.length === 0) {
        delete filter.$text;
        items = await Archive.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      }
    } else {
      items = await Archive.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    }

    const html = buildExcelHtml(items as Record<string, unknown>[]);

    await logAudit('export', {
      user: me,
      req,
      meta: {
        limit,
        q,
        action: 'export_archive'
      }
    });

    const today = new Date();
    const fileName = `export-arsip-${today.toISOString().slice(0, 10)}.xls`;

    return new Response(html, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
