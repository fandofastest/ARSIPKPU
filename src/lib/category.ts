import { Category } from '@/models/Category';

function escapeRegex(v: string) {
  return String(v ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function resolveActiveCategoryPath(input: string) {
  const normalized = String(input ?? '').trim();
  if (!normalized) return '';

  const byPath = await Category.findOne({
    status: 'active',
    path: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' }
  })
    .select({ path: 1 })
    .lean();
  if (byPath?.path) return String(byPath.path).trim();

  const bySlug = await Category.findOne({
    status: 'active',
    slug: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' }
  })
    .select({ path: 1 })
    .lean();
  if (bySlug?.path) return String(bySlug.path).trim();

  const byName = await Category.find({
    status: 'active',
    name: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' }
  })
    .select({ path: 1 })
    .limit(2)
    .lean();
  if (byName.length === 1 && byName[0]?.path) return String(byName[0].path).trim();

  return null;
}
