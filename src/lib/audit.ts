import { type JwtUser } from '@/lib/auth';
import { AuditLog } from '@/models/AuditLog';

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
      meta: opts.meta ?? null
    });
  } catch {
    // ignore
  }
}
