import type { ArchiveVisibility } from '@/models/Archive';

type SharedMember = {
  userId?: unknown;
  role?: 'viewer' | 'editor';
};

type ArchiveLike = {
  uploadedBy?: { userId?: unknown };
  visibility?: string;
  isPublic?: boolean;
  sharedWith?: SharedMember[] | null;
};

function idToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') {
    const m = v.match(/[a-fA-F0-9]{24}/);
    return (m?.[0] || v).toLowerCase();
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.$oid === 'string') return obj.$oid;
    if (typeof obj.toJSON === 'function') {
      try {
        const json = obj.toJSON() as unknown;
        if (json && typeof json === 'object' && typeof (json as { $oid?: unknown }).$oid === 'string') {
          return String((json as { $oid: string }).$oid).toLowerCase();
        }
      } catch {
        // ignore
      }
    }
    if (typeof obj.toHexString === 'function') {
      try {
        return String((obj.toHexString as () => string)()).toLowerCase();
      } catch {
        // ignore
      }
    }
    if (typeof obj.toString === 'function') {
      const s = String(obj.toString());
      if (s && s !== '[object Object]') {
        const m = s.match(/[a-fA-F0-9]{24}/);
        return (m?.[0] || s).toLowerCase();
      }
    }
    if (obj._id !== undefined) return idToString(obj._id);
    if (obj.id !== undefined) return idToString(obj.id);
  }
  return String(v).toLowerCase();
}

export function normalizeVisibility(archive: ArchiveLike): ArchiveVisibility {
  const raw = String(archive.visibility ?? '').trim().toLowerCase();
  if (raw === 'public' || raw === 'private' || raw === 'shared') {
    return raw;
  }
  return archive.isPublic === false ? 'private' : 'public';
}

export function isArchiveOwner(archive: ArchiveLike, userId: string): boolean {
  return idToString(archive.uploadedBy?.userId) === idToString(userId);
}

export function getShareRole(archive: ArchiveLike, userId: string): 'viewer' | 'editor' | null {
  const me = (archive.sharedWith || []).find((m) => idToString(m.userId) === idToString(userId));
  if (!me) return null;
  return me.role === 'editor' ? 'editor' : 'viewer';
}

export function canReadArchive(archive: ArchiveLike, userId: string): boolean {
  if (isArchiveOwner(archive, userId)) return true;
  const visibility = normalizeVisibility(archive);
  if (visibility === 'public') return true;
  if (visibility === 'shared') return Boolean(getShareRole(archive, userId));
  return false;
}

export function canEditArchive(archive: ArchiveLike, userId: string): boolean {
  if (isArchiveOwner(archive, userId)) return true;
  return getShareRole(archive, userId) === 'editor';
}

export function buildReadAccessOrFilter(userId: string) {
  return [
    { 'uploadedBy.userId': userId },
    { visibility: 'public' },
    { visibility: 'shared', 'sharedWith.userId': userId },
    { visibility: { $exists: false }, isPublic: true }
  ];
}
