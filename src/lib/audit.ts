import { type JwtUser } from '@/lib/auth';
import { AuditLog } from '@/models/AuditLog';
import crypto from 'node:crypto';

export type AuditAction =
  | 'upload'
  | 'update'
  | 'delete'
  | 'download'
  | 'preview'
  | 'export'
  | 'login'
  | 'category_create'
  | 'category_update'
  | 'category_delete';

export async function logAudit(
  action: AuditAction,
  opts: {
    user: JwtUser;
    archive?: { archiveId?: string; archiveNumber?: string; originalName?: string };
    req?: Request;
    ip?: string;
    userAgent?: string;
    meta?: Record<string, unknown> | null;
  }
) {
  try {
    const ua = opts.userAgent ?? opts.req?.headers.get('user-agent') ?? '';
    const xfwd = opts.req?.headers.get('x-forwarded-for') ?? '';
    const ip = opts.ip ?? (xfwd ? String(xfwd).split(',')[0].trim() : '') ?? '';

    const prev = await AuditLog.findOne({}).sort({ createdAt: -1, _id: -1 }).select({ immutableHash: 1 }).lean();
    const prevHash = String((prev as { immutableHash?: string } | null)?.immutableHash || '');
    const payload = {
      action,
      userId: opts.user.userId,
      archiveId: opts.archive?.archiveId ?? '',
      ip,
      userAgent: ua,
      meta: opts.meta ?? null,
      ts: new Date().toISOString()
    };
    const immutableHash = crypto
      .createHash('sha256')
      .update(`${prevHash}|${JSON.stringify(payload)}`)
      .digest('hex');

    await AuditLog.create({
      action,
      user: {
        userId: opts.user.userId,
        name: opts.user.name,
        phone: opts.user.phone,
        role: opts.user.role
      },
      archive: {
        archiveId: opts.archive?.archiveId ?? null,
        archiveNumber: opts.archive?.archiveNumber ?? '',
        originalName: opts.archive?.originalName ?? ''
      },
      ip,
      userAgent: ua,
      meta: opts.meta ?? null,
      prevHash,
      immutableHash
    });
  } catch {
    // ignore
  }
}
