import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { IntegrationToken } from '@/models/IntegrationToken';

function sha256(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

export function generateIntegrationTokenSecret() {
  return randomBytes(32).toString('base64url');
}

export function formatIntegrationToken(tokenId: string, secret: string) {
  return `itk_${tokenId}.${secret}`;
}

export function maskIntegrationToken(token: string) {
  const keep = token.slice(-6);
  return `••••••${keep}`;
}

export function parseIntegrationToken(rawToken: string) {
  const token = String(rawToken ?? '').trim();
  if (!token) return null;
  const stripped = token.startsWith('itk_') ? token.slice(4) : token;
  const sep = stripped.indexOf('.');
  if (sep <= 0) return null;
  const tokenId = stripped.slice(0, sep).trim();
  const secret = stripped.slice(sep + 1).trim();
  if (!tokenId || !secret) return null;
  return { tokenId, secret };
}

export async function verifyAndTouchIntegrationToken(rawToken: string, requiredScope: string, ip: string) {
  const parsed = parseIntegrationToken(rawToken);
  if (!parsed) return null;

  const doc = await IntegrationToken.findById(parsed.tokenId).select('+tokenHash').lean();
  if (!doc) return null;
  if (doc.status !== 'active') return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return null;
  if (!Array.isArray(doc.scope) || !doc.scope.includes(requiredScope)) return null;

  const expectedHash = Buffer.from(String(doc.tokenHash), 'utf8');
  const providedHash = Buffer.from(sha256(parsed.secret), 'utf8');
  if (expectedHash.length !== providedHash.length || !timingSafeEqual(expectedHash, providedHash)) {
    return null;
  }

  await IntegrationToken.updateOne(
    { _id: doc._id },
    {
      $set: {
        lastUsedAt: new Date(),
        lastUsedIp: String(ip ?? '').slice(0, 64)
      }
    }
  );

  return { tokenId: String(doc._id), name: String(doc.name ?? ''), appType: String(doc.appType ?? 'app') as 'app' | 'bot' };
}

export function hashIntegrationTokenSecret(secret: string) {
  return sha256(secret);
}
