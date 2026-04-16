import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';

import { Archive } from '@/models/Archive';
import { OcrLog } from '@/models/OcrLog';
import { getAbsolutePath } from '@/lib/storage';

const execFileAsync = promisify(execFile);

function cmd(name: 'pdftoppm' | 'pdftotext' | 'tesseract') {
  if (name === 'pdftoppm') return process.env.PDFTOPPM_PATH?.trim() || 'pdftoppm';
  if (name === 'pdftotext') return process.env.PDFTOTEXT_PATH?.trim() || 'pdftotext';
  return process.env.TESSERACT_PATH?.trim() || 'tesseract';
}

function getExt(originalName: string) {
  return path.extname(String(originalName ?? '')).toLowerCase();
}

function isAudioOrVideo(mimeType: string, originalName: string) {
  const mt = String(mimeType ?? '').toLowerCase();
  if (mt.startsWith('audio/') || mt.startsWith('video/')) return true;
  const ext = getExt(originalName);
  return ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac', '.mp4', '.mkv', '.mov', '.avi', '.webm'].includes(ext);
}

async function tryPdfToText(absPath: string) {
  const { stdout } = await execFileAsync(cmd('pdftotext'), [absPath, '-']);
  return String(stdout ?? '');
}

async function tryPdfToImagesAndOcr(absPath: string, lang = 'eng') {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `ocr-pdf-${Date.now()}-`));
  const outBase = path.join(tmpDir, 'page');

  try {
    // pdftoppm -png -r 200 <pdf> <outbase>
    try {
      await execFileAsync(cmd('pdftoppm'), ['-png', '-r', '200', absPath, outBase]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`pdftoppm not available or failed: ${msg}`);
    }

    const files = (await fs.readdir(tmpDir))
      .filter((f) => f.startsWith('page-') && f.toLowerCase().endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    let combined = '';
    for (const f of files) {
      const imgPath = path.join(tmpDir, f);
      const pageText = await tryTesseractImage(imgPath, lang);
      if (pageText.trim()) {
        combined += `${pageText}\n`;
      }
      if (combined.length >= 2_000_000) break;
    }
    return combined;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {
      // ignore
    });
  }
}

async function tryTesseractImage(absPath: string, lang = 'eng') {
  const tmpBase = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await execFileAsync(cmd('tesseract'), [absPath, tmpBase, '-l', lang]);
  const txtPath = `${tmpBase}.txt`;
  const text = await fs.readFile(txtPath, 'utf8');
  await fs.unlink(txtPath).catch(() => {
    // ignore
  });
  return String(text ?? '');
}

async function extractTextForArchive(a: { relativePath: string; originalName: string; mimeType: string }) {
  const absPath = getAbsolutePath(a.relativePath);
  const ext = getExt(a.originalName);

  if (a.mimeType === 'text/plain' || ext === '.txt') {
    const raw = await fs.readFile(absPath, 'utf8');
    return String(raw ?? '');
  }

  if (a.mimeType === 'application/pdf' || ext === '.pdf') {
    const text = await tryPdfToText(absPath);
    if (text.trim()) return text;

    const lang = process.env.OCR_LANG ?? 'eng';
    const ocrText = await tryPdfToImagesAndOcr(absPath, lang);
    return ocrText;
  }

  if (a.mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'].includes(ext)) {
    const lang = process.env.OCR_LANG ?? 'eng';
    return await tryTesseractImage(absPath, lang);
  }

  throw new Error('Unsupported file type for OCR');
}

function guessTitleFromText(text: string) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const l of lines.slice(0, 50)) {
    const m = l.match(/^(perihal|hal)\s*[:\-]\s*(.+)$/i);
    if (m?.[2]) return m[2].trim().slice(0, 300);
  }

  const first = lines[0] || '';
  return first.slice(0, 300);
}

function guessDocDateFromText(text: string) {
  const t = String(text ?? '');

  const iso = t.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) {
    const d = new Date(`${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmy = t.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const monthMap: Record<string, number> = {
    januari: 1,
    jan: 1,
    februari: 2,
    feb: 2,
    maret: 3,
    mar: 3,
    april: 4,
    apr: 4,
    mei: 5,
    juni: 6,
    jun: 6,
    juli: 7,
    jul: 7,
    agustus: 8,
    agu: 8,
    ags: 8,
    september: 9,
    sep: 9,
    oktober: 10,
    okt: 10,
    november: 11,
    nov: 11,
    desember: 12,
    des: 12
  };

  const indo = t.match(/\b(0?[1-9]|[12]\d|3[01])\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|ags|september|sep|oktober|okt|november|nov|desember|des)\s+(20\d{2})\b/i);
  if (indo) {
    const m = monthMap[String(indo[2]).toLowerCase()];
    if (m) {
      const d = new Date(`${indo[3]}-${String(m).padStart(2, '0')}-${String(indo[1]).padStart(2, '0')}`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export async function processNextPendingOcr() {
  const doc = await Archive.findOneAndUpdate(
    { status: 'active', ocrStatus: 'pending' },
    { $set: { ocrStatus: 'processing', ocrError: '', ocrUpdatedAt: new Date() } },
    { sort: { createdAt: 1 }, new: true }
  );

  if (!doc) return { picked: 0, processed: 0, failed: 0, skipped: 0 };

  const startedAt = new Date();
  const log = await OcrLog.create({
    archiveId: doc._id,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    status: 'processing',
    message: '',
    startedAt,
    finishedAt: null
  });

  try {
    if (isAudioOrVideo(doc.mimeType, doc.originalName)) {
      doc.ocrStatus = 'done';
      doc.ocrError = '';
      doc.ocrUpdatedAt = new Date();
      await doc.save();

      log.status = 'skipped';
      log.message = 'Skipped audio/video';
      log.finishedAt = new Date();
      await log.save();

      return { picked: 1, processed: 0, failed: 0, skipped: 1 };
    }

    const text = await extractTextForArchive({
      relativePath: doc.relativePath,
      originalName: doc.originalName,
      mimeType: doc.mimeType
    });

    if (!String(text ?? '').trim()) {
      throw new Error('No text extracted');
    }

    doc.extractedText = String(text ?? '').slice(0, 2_000_000);
    doc.ocrStatus = 'done';
    doc.ocrError = '';
    doc.ocrUpdatedAt = new Date();

    if (!String((doc as unknown as { title?: string }).title ?? '').trim()) {
      (doc as unknown as { title?: string }).title = guessTitleFromText(doc.extractedText);
    }

    if (!doc.docDate) {
      const guessed = guessDocDateFromText(doc.extractedText);
      if (guessed) doc.docDate = guessed;
    }

    const docDateSource = String((doc as unknown as { docDateSource?: string }).docDateSource ?? 'unknown');
    if ((!doc.docDate || docDateSource === 'default') && docDateSource !== 'user') {
      const guessed = guessDocDateFromText(doc.extractedText);
      if (guessed) {
        doc.docDate = guessed;
        (doc as unknown as { docDateSource?: string }).docDateSource = 'ocr';
      }
    }

    const kind = String((doc as unknown as { docKind?: string; type?: string }).docKind || doc.type || '').trim();
    if (kind) {
      (doc as unknown as { docKind?: string }).docKind = kind;
      doc.type = kind;
    }

    await doc.save();

    log.status = 'done';
    log.message = '';
    log.finishedAt = new Date();
    await log.save();

    return { picked: 1, processed: 1, failed: 0, skipped: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR failed';
    doc.ocrStatus = 'failed';
    doc.ocrError = String(msg).slice(0, 500);
    doc.ocrUpdatedAt = new Date();
    await doc.save();

    log.status = 'failed';
    log.message = String(msg).slice(0, 500);
    log.finishedAt = new Date();
    await log.save();

    return { picked: 1, processed: 0, failed: 1, skipped: 0 };
  }
}

export async function processPendingOcrBatch(limit: number) {
  const lim = Math.max(1, Math.min(20, Math.floor(limit)));
  let picked = 0;
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < lim; i += 1) {
    const r = await processNextPendingOcr();
    picked += r.picked;
    processed += r.processed;
    failed += r.failed;
    skipped += r.skipped;
    if (r.picked === 0) break;
  }

  return { picked, processed, failed, skipped };
}

export function triggerOcrInBackground(limit = 1) {
  const lim = Math.max(1, Math.min(5, Math.floor(limit)));
  setTimeout(() => {
    processPendingOcrBatch(lim).catch(() => {
      // ignore
    });
  }, 0);
}
