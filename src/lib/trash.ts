import { Archive } from '@/models/Archive';
import { deleteFile } from '@/lib/storage';

const TRASH_RETENTION_DAYS = 30;

function getTrashCutoffDate() {
  const ms = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

export async function purgeExpiredTrash() {
  const cutoff = getTrashCutoffDate();
  const expired = await Archive.find({
    status: 'deleted',
    trashedAt: { $ne: null, $lt: cutoff }
  })
    .select({ _id: 1, relativePath: 1 })
    .lean();

  if (!expired.length) {
    return { purged: 0 };
  }

  for (const row of expired) {
    const rel = String((row as { relativePath?: string }).relativePath ?? '').trim();
    if (!rel) continue;
    await deleteFile(rel).catch(() => {
      // If file already missing, still clean DB row below.
    });
  }

  const ids = expired.map((x) => (x as { _id: unknown })._id);
  await Archive.deleteMany({ _id: { $in: ids } });
  return { purged: ids.length };
}

export function getTrashRetentionDays() {
  return TRASH_RETENTION_DAYS;
}
