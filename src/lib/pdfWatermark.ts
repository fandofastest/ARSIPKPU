import { promises as fs } from 'node:fs';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

import { getAbsolutePath } from '@/lib/storage';

function normalizeOpacity(v: number) {
  if (!Number.isFinite(v)) return 0.16;
  if (v < 0.05) return 0.05;
  if (v > 0.6) return 0.6;
  return v;
}

export async function applyPdfWatermarkByRelativePath(relativePath: string) {
  const watermarkText = String(process.env.PDF_WATERMARK_TEXT ?? 'KPU').trim() || 'KPU';
  const watermarkOpacity = normalizeOpacity(Number(process.env.PDF_WATERMARK_OPACITY ?? '0.16'));
  const absPath = getAbsolutePath(relativePath);

  const input = await fs.readFile(absPath);
  const pdf = await PDFDocument.load(input, { updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const minSide = Math.max(1, Math.min(width, height));
    const fontSize = Math.max(22, minSide * 0.095);
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const angleDeg = 45;
    const angleRad = (angleDeg * Math.PI) / 180;
    const centerOffsetX = (textWidth / 2) * Math.cos(angleRad) - (fontSize / 2) * Math.sin(angleRad);
    const centerOffsetY = (textWidth / 2) * Math.sin(angleRad) + (fontSize / 2) * Math.cos(angleRad);

    page.drawText(watermarkText, {
      x: width / 2 - centerOffsetX,
      y: height / 2 - centerOffsetY,
      size: fontSize,
      font,
      color: rgb(0.86, 0.1, 0.1),
      opacity: watermarkOpacity,
      rotate: degrees(angleDeg)
    });
  }

  const out = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  await fs.writeFile(absPath, out);
  const st = await fs.stat(absPath);
  return st.size;
}
