type SignatureMime =
  | 'application/pdf'
  | 'application/zip'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'audio/mpeg'
  | 'video/mp4';

function startsWithBytes(input: Uint8Array, sig: number[]) {
  if (input.length < sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) {
    if (input[i] !== sig[i]) return false;
  }
  return true;
}

export function detectMimeFromSignature(buf: Buffer): SignatureMime | null {
  if (!buf.length) return null;
  if (startsWithBytes(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  if (startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWithBytes(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWithBytes(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04])) return 'application/zip';
  if (startsWithBytes(buf, [0x49, 0x44, 0x33]) || startsWithBytes(buf, [0xff, 0xfb])) return 'audio/mpeg';
  if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
  return null;
}

export function isMimeCompatibleWithSignature(declaredMime: string, detectedMime: string | null) {
  const declared = String(declaredMime ?? '').toLowerCase().trim();
  if (!detectedMime) return true;
  if (declared === detectedMime) return true;

  const zipCompatible = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]);

  if (detectedMime === 'application/zip' && zipCompatible.has(declared)) return true;
  if (declared === 'text/plain') return true;
  return false;
}
