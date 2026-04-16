type LimitRule = { limit: number; windowMs: number; keySuffix: string };

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  store.set(key, current);
  return { ok: true, remaining: Math.max(0, limit - current.count), retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function checkIntegrationRateLimit(baseKey: string, rules: readonly LimitRule[]) {
  for (const rule of rules) {
    const out = hit(`${baseKey}:${rule.keySuffix}`, rule.limit, rule.windowMs);
    if (!out.ok) return { ok: false as const, retryAfterSec: out.retryAfterSec };
  }
  return { ok: true as const, retryAfterSec: 0 };
}

export const RATE_RULES = {
  LOGIN: [
    { keySuffix: 'login_1m', limit: Number(process.env.INTEGRATION_RATE_LOGIN_PER_MIN ?? '20'), windowMs: 60_000 },
    { keySuffix: 'login_10s', limit: Number(process.env.INTEGRATION_RATE_LOGIN_BURST_10S ?? '6'), windowMs: 10_000 }
  ],
  UPLOAD: [
    { keySuffix: 'upload_1m', limit: Number(process.env.INTEGRATION_RATE_UPLOAD_PER_MIN ?? '30'), windowMs: 60_000 },
    { keySuffix: 'upload_10s', limit: Number(process.env.INTEGRATION_RATE_UPLOAD_BURST_10S ?? '8'), windowMs: 10_000 }
  ],
  LIST: [
    { keySuffix: 'list_1m', limit: Number(process.env.INTEGRATION_RATE_LIST_PER_MIN ?? '120'), windowMs: 60_000 },
    { keySuffix: 'list_10s', limit: Number(process.env.INTEGRATION_RATE_LIST_BURST_10S ?? '30'), windowMs: 10_000 }
  ]
} as const;
