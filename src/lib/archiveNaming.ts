import path from 'node:path';

function normalizeToken(input: string, fallback: string, maxLen = 48) {
  const cleaned = String(input ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const useValue = cleaned || fallback;
  return useValue.slice(0, maxLen);
}

function formatDateYYYYMMDD(d: Date) {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function splitCategory(categoryPath: string) {
  const parts = String(categoryPath ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  const kategori = parts[0] || '';
  const subkategori = parts.length > 1 ? parts.slice(1).join('_') : '';
  return { kategori, subkategori };
}

export function buildStandardArchiveOriginalName(input: {
  categoryPath?: string;
  docKind?: string;
  docDate?: Date | null;
  docNumber?: string;
  archiveNumber?: string;
  sourceNameWithExt?: string;
}) {
  const { kategori, subkategori } = splitCategory(String(input.categoryPath ?? ''));
  const KATEGORI = normalizeToken(kategori, 'LAINNYA', 40);
  const SUBKATEGORI = normalizeToken(subkategori, 'UMUM', 60);
  const JENIS = normalizeToken(String(input.docKind ?? ''), 'DOKUMEN', 40);
  const TANGGAL = formatDateYYYYMMDD(input.docDate instanceof Date && !Number.isNaN(input.docDate.getTime()) ? input.docDate : new Date());
  const NOMOR = normalizeToken(String(input.docNumber ?? '').trim() || String(input.archiveNumber ?? '').trim(), 'NO', 60);

  const ext = path.extname(String(input.sourceNameWithExt ?? '').trim()).toLowerCase();
  return `${KATEGORI}_${SUBKATEGORI}_${JENIS}_${TANGGAL}_${NOMOR}${ext}`;
}
