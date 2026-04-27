export type OcrExecutionMode = 'internal' | 'external';

export function getOcrExecutionMode(): OcrExecutionMode {
  const raw = String(process.env.OCR_EXECUTION_MODE ?? 'external').trim().toLowerCase();
  return raw === 'internal' ? 'internal' : 'external';
}

export function shouldTriggerLocalOcr() {
  return getOcrExecutionMode() === 'internal';
}
