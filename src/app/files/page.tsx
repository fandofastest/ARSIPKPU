'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';

export const dynamic = 'force-dynamic';

type ArchiveItem = {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  type?: string;
  tags?: string[];
  isPublic?: boolean;
  visibility?: 'public' | 'private' | 'shared';
  sharedWith?: Array<{ userId: string; name: string; phone: string; role: 'viewer' | 'editor' }>;
  docNumber?: string;
  docDate?: string | null;
  docKind?: string;
  unitSender?: string;
  unitRecipient?: string;
  title?: string;
  subject?: string;
  year?: number | null;
  category?: string;
  ocrStatus?: 'pending' | 'processing' | 'done' | 'failed';
  ocrError?: string;
  ocrUpdatedAt?: string | null;
  gdriveFileId?: string;
  gdriveLink?: string;
  gdriveSyncedAt?: string | null;
  gdriveSyncError?: string;
  searchSnippet?: string;
  trashedAt?: string | null;
  uploadedBy: { userId?: string; name: string; phone: string };
  createdAt: string;
};

type ListResp =
  | {
      success: true;
      data: ArchiveItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }
  | { error: string };

type TrashResp =
  | {
      success: true;
      data: ArchiveItem[];
      meta: { page: number; limit: number; total: number; totalPages: number; retentionDays: number };
    }
  | { error: string };

type MeResp =
  | { success: true; data: { userId: string; name: string; phone: string; role: string } }
  | { error: string };

type UpdateResp =
  | { success: true; data: ArchiveItem }
  | { error: string; details?: unknown };

type ShareResp =
  | {
      success: true;
      data: {
        visibility: 'public' | 'private' | 'shared';
        sharedWith: Array<{ userId: string; name: string; phone: string; role: 'viewer' | 'editor' }>;
      };
    }
  | { error: string };

type UserSearchResp =
  | {
      success: true;
      data: Array<{ userId: string; name: string; phone: string; nip?: string; role?: string }>;
    }
  | { error: string };

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  parentSlug?: string;
  path?: string;
  level?: number;
  description?: string;
};

type CategoriesResp =
  | { success: true; data: CategoryItem[] }
  | { error: string };

type UploadFileOverride = {
  title: string;
  docNumber: string;
  docDate: string;
  docKind: string;
  category: string;
  description: string;
  tags: string;
  visibility: 'inherit' | 'public' | 'private';
};

function categoryLabel(c: CategoryItem) {
  return (c.path && c.path.trim()) || c.name;
}

function sortCategory(a: CategoryItem, b: CategoryItem) {
  return categoryLabel(a).localeCompare(categoryLabel(b));
}

function filenameWithoutExt(name: string) {
  return name.replace(/\.[^/.]+$/, '');
}

function itemVisibility(it: ArchiveItem) {
  if (it.visibility === 'public' || it.visibility === 'private' || it.visibility === 'shared') return it.visibility;
  return it.isPublic === false ? 'private' : 'public';
}

function itemShareRole(it: ArchiveItem, userId?: string) {
  if (!userId) return null;
  const found = (it.sharedWith || []).find((x) => x.userId === userId);
  return found?.role || null;
}

function isOwnerItem(it: ArchiveItem, me: { userId: string; phone: string; role: string } | null) {
  if (!me?.userId) return false;
  return it.uploadedBy?.userId ? String(it.uploadedBy.userId) === me.userId : it.uploadedBy?.phone === me.phone;
}

function canManageItem(it: ArchiveItem, me: { userId: string; phone: string; role: string } | null) {
  if (!me || me.role === 'viewer') return false;
  const isOwner = isOwnerItem(it, me);
  if (isOwner) return true;
  return itemShareRole(it, me.userId) === 'editor';
}

function FilesPageContent() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useSearchParams();

  function nowLocalDateTimeValue() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [me, setMe] = useState<{ userId: string; phone: string; role: string } | null>(null);

  const [q, setQ] = useState('');
  const [fDocNumber, setFDocNumber] = useState('');
  const [fDocFrom, setFDocFrom] = useState('');
  const [fDocTo, setFDocTo] = useState('');
  const [fDocKind, setFDocKind] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fRootCategorySlug, setFRootCategorySlug] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalName, setCategoryModalName] = useState('');
  const [categoryModalTarget, setCategoryModalTarget] = useState<'filter' | 'upload' | 'edit'>('upload');
  const categoryModalInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadDocDate, setUploadDocDate] = useState('');
  const [uploadDocKind, setUploadDocKind] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadRootCategorySlug, setUploadRootCategorySlug] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadPrivate, setUploadPrivate] = useState(false);
  const [uploadHybridEnabled, setUploadHybridEnabled] = useState(false);
  const [uploadOverrides, setUploadOverrides] = useState<UploadFileOverride[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editDocDate, setEditDocDate] = useState('');
  const [editDocKind, setEditDocKind] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRootCategorySlug, setEditRootCategorySlug] = useState('');
  const [editVisibilityAtOpen, setEditVisibilityAtOpen] = useState<'public' | 'private' | 'shared'>('public');
  const [editSaving, setEditSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ArchiveItem | null>(null);

  const [openMenu, setOpenMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gdriveBusyId, setGdriveBusyId] = useState<string | null>(null);
  const [gdriveUnlinkBusyId, setGdriveUnlinkBusyId] = useState<string | null>(null);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [unlinkConfirmItem, setUnlinkConfirmItem] = useState<ArchiveItem | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashItems, setTrashItems] = useState<ArchiveItem[]>([]);
  const [trashMeta, setTrashMeta] = useState<{ total: number; retentionDays: number } | null>(null);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareItem, setShareItem] = useState<ArchiveItem | null>(null);
  const [shareVisibility, setShareVisibility] = useState<'public' | 'private' | 'shared'>('private');
  const [shareSelected, setShareSelected] = useState<Array<{ userId: string; name: string; phone: string; role: 'viewer' | 'editor' }>>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [shareUsersLoading, setShareUsersLoading] = useState(false);
  const [shareUsers, setShareUsers] = useState<Array<{ userId: string; name: string; phone: string; nip?: string; role?: string }>>([]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, CategoryItem>();
    for (const c of categories) m.set(c.slug, c);
    return m;
  }, [categories]);

  const rootCategories = useMemo(
    () => categories.filter((c) => !String(c.parentSlug ?? '').trim() || Number(c.level ?? 0) === 0).slice().sort(sortCategory),
    [categories]
  );

  function getRootSlugByValue(value: string) {
    const v = String(value ?? '').trim();
    if (!v) return '';
    const found = categories.find((c) => categoryLabel(c).trim().toLowerCase() === v.toLowerCase());
    if (!found) return '';
    let current: CategoryItem | undefined = found;
    while (current && String(current.parentSlug ?? '').trim()) {
      const parent = categoryMap.get(String(current.parentSlug));
      if (!parent) break;
      current = parent;
    }
    return current?.slug || found.slug || '';
  }

  function getDescendantOptions(rootSlug: string) {
    const root = categoryMap.get(rootSlug);
    if (!root) return [] as CategoryItem[];
    const rootPath = categoryLabel(root);
    return categories
      .filter((c) => c.slug !== rootSlug && categoryLabel(c).startsWith(`${rootPath} / `))
      .slice()
      .sort(sortCategory);
  }

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (q.trim()) sp.set('q', q.trim());
    if (fDocNumber.trim()) sp.set('docNumber', fDocNumber.trim());
    if (fDocFrom.trim()) sp.set('docFrom', fDocFrom.trim());
    if (fDocTo.trim()) sp.set('docTo', fDocTo.trim());
    if (fDocKind.trim()) sp.set('docKind', fDocKind.trim());
    if (fCategory.trim()) sp.set('category', fCategory.trim());
    return sp.toString();
  }, [page, limit, q, fDocNumber, fDocFrom, fDocTo, fDocKind, fCategory]);

  const exportQuery = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (fDocNumber.trim()) sp.set('docNumber', fDocNumber.trim());
    if (fDocFrom.trim()) sp.set('docFrom', fDocFrom.trim());
    if (fDocTo.trim()) sp.set('docTo', fDocTo.trim());
    if (fDocKind.trim()) sp.set('docKind', fDocKind.trim());
    if (fCategory.trim()) sp.set('category', fCategory.trim());
    sp.set('limit', '10000');
    return sp.toString();
  }, [q, fDocNumber, fDocFrom, fDocTo, fDocKind, fCategory]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    const urlQ = (searchParams.get('q') ?? '').trim();
    const urlCategory = (searchParams.get('category') ?? '').trim();
    const urlUploader = (searchParams.get('uploader') ?? '').trim();
    if (urlQ && urlQ !== q) {
      setQ(urlQ);
      setPage(1);
    }
    if (urlCategory !== fCategory) {
      setFCategory(urlCategory);
      setPage(1);
    }
    if (!urlQ && urlUploader && urlUploader !== q) {
      setQ(urlUploader);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    setFRootCategorySlug(getRootSlugByValue(fCategory));
  }, [fCategory, categories]);

  useEffect(() => {
    setUploadRootCategorySlug(getRootSlugByValue(uploadCategory));
  }, [uploadCategory, categories]);

  useEffect(() => {
    setEditRootCategorySlug(getRootSlugByValue(editCategory));
  }, [editCategory, categories]);

  useEffect(() => {
    setPage(1);
  }, [q, fDocNumber, fDocFrom, fDocTo, fDocKind, fCategory, limit]);

  function refresh() {
    setLoading(true);
    setError(null);
    fetch(`/api/archive?${query}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<ListResp>)
      .then((d) => {
        if ('success' in d) {
          setItems(d.data);
          setMeta({ total: d.meta.total, totalPages: d.meta.totalPages });
        } else {
          setError(d.error);
          setToast({ kind: 'error', title: 'Failed to load', text: d.error });
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json() as Promise<MeResp>)
      .then((d) => {
        if ('success' in d) setMe({ userId: d.data.userId, phone: d.data.phone, role: d.data.role });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  function loadCategories() {
    fetch('/api/categories', { credentials: 'include' })
      .then((r) => r.json() as Promise<CategoriesResp>)
      .then((d) => {
        if ('success' in d) setCategories(d.data);
      })
      .catch(() => {
        // ignore
      });
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categoryModalOpen) {
      const t = setTimeout(() => {
        categoryModalInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [categoryModalOpen]);

  async function createCategoryInline(name: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
    const nm = String(name ?? '').trim();
    if (!nm) return { ok: false, error: 'Nama kategori kosong' };
    if (!me || (me.role !== 'admin' && me.role !== 'staff')) return { ok: false, error: 'Forbidden' };
    if (creatingCategory) return { ok: false, error: 'Creating…' };

    const exists = categories.some((c) => categoryLabel(c).trim().toLowerCase() === nm.toLowerCase());
    if (exists) {
      return { ok: false, error: 'Kategori sudah ada' };
    }

    setCreatingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm })
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: CategoryItem; error?: string };
      if (!res.ok || !json.success || !json.data) {
        const errMsg = json?.error || 'Failed to create category';
        setToast({ kind: 'error', title: 'Create category failed', text: errMsg });
        return { ok: false, error: errMsg };
      }

      setCategories((cur) => {
        const exists = cur.some((c) => c._id === json.data!._id);
        const next = exists ? cur : [...cur, json.data!];
        return next.slice().sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
      });

      setToast({ kind: 'success', title: 'Category created', text: nm });
      return { ok: true, name: categoryLabel(json.data) };
    } catch {
      setToast({ kind: 'error', title: 'Create category failed', text: 'Network error' });
      return { ok: false, error: 'Network error' };
    } finally {
      setCreatingCategory(false);
    }
  }

  function openCategoryModal(target: 'filter' | 'upload' | 'edit') {
    if (!me || (me.role !== 'admin' && me.role !== 'staff')) return;
    setCategoryModalTarget(target);
    setCategoryModalName('');
    setCategoryModalOpen(true);
  }

  async function submitCategoryModal() {
    const nm = categoryModalName.trim();
    if (!nm) return;
    const r = await createCategoryInline(nm);
    if (!r.ok) {
      setToast({ kind: 'error', title: 'Create category failed', text: r.error });
      return;
    }
    if (categoryModalTarget === 'filter') setFCategory(r.name);
    if (categoryModalTarget === 'upload') setUploadCategory(r.name);
    if (categoryModalTarget === 'edit') setEditCategory(r.name);
    setCategoryModalOpen(false);
  }

  useEffect(() => {
    refresh();
  }, [query]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t && typeof t.closest === 'function' && t.closest('.menuWrap')) return;
      if (t && typeof t.closest === 'function' && t.closest('.menu')) return;
      setOpenMenu(null);
    }
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, []);

  function openUpload() {
    setMessage(null);
    setError(null);
    setToast(null);
    setUploadFiles([]);
    setUploadTitle('');
    setUploadDocNumber('');
    setUploadDocDate('');
    setUploadDocKind('');
    setUploadCategory('');
    setUploadDesc('');
    setUploadTags('');
    setUploadPrivate(false);
    setUploadHybridEnabled(false);
    setUploadOverrides([]);
    setProgress(0);
    setUploadOpen(true);
  }

  function buildAutoOverride(file: File, idx: number, files: File[]): UploadFileOverride {
    const baseDocNumber = uploadDocNumber.trim();
    const autoDocNumber = baseDocNumber ? (files.length > 1 ? `${baseDocNumber}-${idx + 1}` : baseDocNumber) : '';
    return {
      title: uploadTitle.trim() || filenameWithoutExt(file.name),
      docNumber: autoDocNumber,
      docDate: uploadDocDate.trim(),
      docKind: uploadDocKind.trim(),
      category: uploadCategory.trim(),
      description: uploadDesc.trim(),
      tags: uploadTags.trim(),
      visibility: 'inherit'
    };
  }

  function onChooseUploadFiles(files: File[]) {
    setUploadFiles(files);
    setUploadOverrides(files.map((f, idx) => buildAutoOverride(f, idx, files)));
    if (!files.length) setUploadHybridEnabled(false);
  }

  function updateUploadOverride(index: number, patch: Partial<UploadFileOverride>) {
    setUploadOverrides((cur) => cur.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  useEffect(() => {
    if (!uploadHybridEnabled || !uploadFiles.length) return;
    setUploadOverrides((current) =>
      uploadFiles.map((f, idx) => {
        const auto = buildAutoOverride(f, idx, uploadFiles);
        const existing = current[idx];
        if (!existing) return auto;
        return {
          title: existing.title || auto.title,
          docNumber: existing.docNumber || auto.docNumber,
          docDate: existing.docDate || auto.docDate,
          docKind: existing.docKind || auto.docKind,
          category: existing.category || auto.category,
          description: existing.description || auto.description,
          tags: existing.tags || auto.tags,
          visibility: existing.visibility
        };
      })
    );
  }, [uploadHybridEnabled, uploadFiles, uploadTitle, uploadDocNumber, uploadDocDate, uploadDocKind, uploadCategory, uploadDesc, uploadTags]);

  function openTrash() {
    setTrashOpen(true);
    setTrashLoading(true);
    fetch('/api/archive/trash?page=1&limit=100', { credentials: 'include' })
      .then((r) => r.json() as Promise<TrashResp>)
      .then((d) => {
        if ('success' in d) {
          setTrashItems(d.data);
          setTrashMeta({ total: d.meta.total, retentionDays: d.meta.retentionDays });
        } else {
          setToast({ kind: 'error', title: 'Failed to load trash', text: d.error });
        }
      })
      .catch(() => {
        setToast({ kind: 'error', title: 'Failed to load trash', text: 'Network error' });
      })
      .finally(() => setTrashLoading(false));
  }

  async function restoreFromTrashById(id: string) {
    setRestoreBusyId(id);
    try {
      const res = await fetch(`/api/archive/${id}/restore`, {
        method: 'POST',
        credentials: 'include'
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setToast({ kind: 'error', title: 'Restore failed', text: json.error || 'Failed to restore file' });
        return;
      }
      setTrashItems((cur) => cur.filter((x) => x._id !== id));
      setTrashMeta((cur) => (cur ? { ...cur, total: Math.max(0, cur.total - 1) } : cur));
      setToast({ kind: 'success', title: 'Restored', text: 'File restored from trash.' });
      refresh();
    } catch {
      setToast({ kind: 'error', title: 'Restore failed', text: 'Network error' });
    } finally {
      setRestoreBusyId(null);
    }
  }

  async function doUpload() {
    if (!uploadFiles.length) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    setToast(null);

    const form = new FormData();
    for (const f of uploadFiles) {
      form.append('file', f);
    }
    form.append('title', uploadTitle);
    form.append('docNumber', uploadDocNumber);
    form.append('docDate', uploadDocDate.trim() ? uploadDocDate.trim() : nowLocalDateTimeValue());
    form.append('docDateSource', uploadDocDate.trim() ? 'user' : 'default');
    form.append('docKind', uploadDocKind);
    form.append('category', uploadCategory);
    form.append('description', uploadDesc);
    form.append('tags', uploadTags);
    if (uploadPrivate) form.append('private', '1');
    if (uploadHybridEnabled && uploadOverrides.length === uploadFiles.length) {
      const cleaned = uploadOverrides
        .map((o, idx) => ({
          index: idx,
          title: o.title.trim(),
          docNumber: o.docNumber.trim(),
          docDate: o.docDate.trim(),
          docKind: o.docKind.trim(),
          category: o.category.trim(),
          description: o.description.trim(),
          tags: o.tags.trim(),
          visibility: o.visibility
        }))
        .filter(
          (o) =>
            o.title ||
            o.docNumber ||
            o.docDate ||
            o.docKind ||
            o.category ||
            o.description ||
            o.tags ||
            o.visibility !== 'inherit'
        );
      if (cleaned.length) {
        form.append('perFileOverrides', JSON.stringify(cleaned));
      }
    }

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      };

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            setMessage('Upload successful');
            const count = json?.meta?.count;
            const dupCount = Number(json?.meta?.duplicatesSkipped ?? 0);
            setToast({
              kind: 'success',
              title: 'Upload successful',
              text:
                typeof count === 'number'
                  ? `${count} files uploaded${dupCount > 0 ? `, ${dupCount} duplicate skipped` : ''}. OCR will process in background.`
                  : 'OCR will process in background.'
            });
            setUploadOpen(false);
            refresh();
          } else {
            const dupArr = Array.isArray(json?.duplicates) ? json.duplicates : [];
            const dupHint =
              dupArr.length > 0
                ? ` Duplicate: ${dupArr
                    .slice(0, 2)
                    .map((d: { uploadedName?: string }) => d?.uploadedName || 'file')
                    .join(', ')}${dupArr.length > 2 ? ' ...' : ''}`
                : '';
            const msg = (json?.error || 'Upload failed') + dupHint;
            setError(msg);
            setToast({ kind: 'error', title: 'Upload failed', text: msg });
          }
        } catch {
          setError('Upload failed');
          setToast({ kind: 'error', title: 'Upload failed', text: 'Upload failed' });
        } finally {
          setUploading(false);
          resolve();
        }
      };

      xhr.onerror = () => {
        setError('Network error');
        setToast({ kind: 'error', title: 'Network error', text: 'Please try again.' });
        setUploading(false);
        resolve();
      };

      xhr.send(form);
    });
  }

  function openEdit(it: ArchiveItem) {
    setEditId(it._id);
    setEditTitle(it.title || it.subject || '');
    setEditTags(it.tags?.join(', ') || '');
    setEditDesc((it as unknown as { description?: string }).description || '');
    const v = itemVisibility(it);
    setEditVisibilityAtOpen(v);
    setEditIsPublic(v === 'public');
    setEditDocNumber(it.docNumber || '');
    setEditDocDate(it.docDate ? new Date(it.docDate).toISOString().slice(0, 16) : '');
    setEditDocKind(it.docKind || it.type || '');
    setEditCategory(it.category || '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError(null);
    try {
      const body = {
        title: editTitle,
        description: editDesc,
        docNumber: editDocNumber,
        docDate: editDocDate.trim() ? editDocDate.trim() : null,
        docKind: editDocKind,
        category: editCategory,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      };
      if (editVisibilityAtOpen !== 'shared') {
        (body as { isPublic?: boolean }).isPublic = editIsPublic;
      }

      const res = await fetch(`/api/archive/${editId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = (await res.json()) as UpdateResp;
      if (!res.ok) {
        setError('error' in json ? json.error : 'Failed to update');
        setToast({ kind: 'error', title: 'Update failed', text: 'error' in json ? json.error : 'Failed to update' });
        return;
      }
      setEditOpen(false);
      setEditId(null);
      setToast({ kind: 'success', title: 'Updated', text: 'Metadata has been saved.' });
      refresh();
    } catch {
      setError('Failed to update');
      setToast({ kind: 'error', title: 'Update failed', text: 'Failed to update' });
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteItem(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/archive/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(json?.error || 'Failed to delete');
        setToast({ kind: 'error', title: 'Delete failed', text: json?.error || 'Failed to delete' });
        return;
      }
      setToast({ kind: 'success', title: 'Deleted', text: 'Moved to trash.' });
      refresh();
    } catch {
      setError('Failed to delete');
      setToast({ kind: 'error', title: 'Delete failed', text: 'Failed to delete' });
    }
  }

  function openDeleteConfirm(it: ArchiveItem) {
    setDeleteId(it._id);
    setDeleteName(it.originalName);
    setDeleteOpen(true);
  }

  function openPreview(it: ArchiveItem) {
    setPreviewUrl(`/api/archive/${it._id}?inline=1`);
    setPreviewMime(it.mimeType);
    setPreviewOpen(true);
  }

  function openDetail(it: ArchiveItem) {
    setDetailItem(it);
    setDetailOpen(true);
  }

  async function searchUsersForShare(qInput: string) {
    setShareUsersLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '20');
      if (qInput.trim()) qp.set('q', qInput.trim());
      const r = await fetch(`/api/users/search?${qp.toString()}`, { credentials: 'include' });
      const j = (await r.json().catch(() => ({}))) as UserSearchResp;
      if (!r.ok || !('success' in j && j.success)) {
        return;
      }
      const currentOwnerUserId = shareItem?.uploadedBy?.userId ? String(shareItem.uploadedBy.userId) : '';
      setShareUsers(
        j.data.filter((u) => {
          if (!me?.userId) return true;
          if (u.userId === me.userId) return false;
          if (currentOwnerUserId && u.userId === currentOwnerUserId) return false;
          return true;
        })
      );
    } finally {
      setShareUsersLoading(false);
    }
  }

  async function openShare(it: ArchiveItem) {
    setShareItem(it);
    setShareOpen(true);
    setShareLoading(true);
    setShareSelected([]);
    setShareQuery('');
    setShareUsers([]);
    try {
      const res = await fetch(`/api/archive/${it._id}/share`, { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as ShareResp;
      if (!res.ok || !('success' in json && json.success)) {
        setToast({ kind: 'error', title: 'Share load failed', text: 'error' in json ? json.error : 'Failed to load share setting' });
        setShareOpen(false);
        return;
      }
      setShareVisibility(json.data.visibility);
      setShareSelected(json.data.sharedWith || []);
      await searchUsersForShare('');
    } catch {
      setToast({ kind: 'error', title: 'Share load failed', text: 'Network error' });
      setShareOpen(false);
    } finally {
      setShareLoading(false);
    }
  }

  useEffect(() => {
    if (!shareOpen) return;
    const t = setTimeout(() => {
      void searchUsersForShare(shareQuery);
    }, 250);
    return () => clearTimeout(t);
  }, [shareOpen, shareQuery]);

  function toggleShareUser(user: { userId: string; name: string; phone: string }) {
    setShareSelected((cur) => {
      const exists = cur.find((x) => x.userId === user.userId);
      if (exists) return cur.filter((x) => x.userId !== user.userId);
      return [...cur, { userId: user.userId, name: user.name, phone: user.phone, role: 'viewer' }];
    });
  }

  function setShareRole(userId: string, role: 'viewer' | 'editor') {
    setShareSelected((cur) => cur.map((x) => (x.userId === userId ? { ...x, role } : x)));
  }

  async function saveShare() {
    if (!shareItem) return;
    setShareSaving(true);
    try {
      const payload = {
        visibility: shareVisibility,
        sharedWith: shareSelected.map((x) => ({ userId: x.userId, role: x.role }))
      };
      const res = await fetch(`/api/archive/${shareItem._id}/share`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => ({}))) as ShareResp;
      if (!res.ok || !('success' in json && json.success)) {
        setToast({ kind: 'error', title: 'Share save failed', text: 'error' in json ? json.error : 'Failed to save share setting' });
        return;
      }
      setToast({ kind: 'success', title: 'Share saved', text: 'Permission updated.' });
      setShareOpen(false);
      refresh();
    } catch {
      setToast({ kind: 'error', title: 'Share save failed', text: 'Network error' });
    } finally {
      setShareSaving(false);
    }
  }

  async function copyTextToClipboard(text: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function renderSnippet(snippet: string, needle: string) {
    const s = String(snippet ?? '');
    const n = String(needle ?? '').trim();
    if (!s) return null;
    if (!n) return <>{s}</>;

    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return <>{s}</>;
    const re = new RegExp(`(${escaped})`, 'ig');
    const parts = s.split(re);
    return (
      <>
        {parts.map((part, idx) =>
          idx % 2 === 1 ? (
            <mark key={idx} style={{ background: 'rgba(250, 204, 21, 0.35)', color: 'inherit', padding: '0 2px', borderRadius: 2 }}>
              {part}
            </mark>
          ) : (
            <span key={idx}>{part}</span>
          )
        )}
      </>
    );
  }

  async function syncGdriveLink(it: ArchiveItem) {
    setError(null);
    setGdriveBusyId(it._id);
    try {
      const res = await fetch(`/api/archive/${it._id}/gdrive-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { url?: string; fileId?: string; syncedAt?: string | null; cached?: boolean };
      };
      if (!res.ok || !json.success || !json.data?.url) {
        const msg = json?.error || 'Failed to sync Google Drive link';
        setError(msg);
        setToast({ kind: 'error', title: 'GDrive sync failed', text: msg });
        return;
      }

      const nextLink = String(json.data.url);
      const nextFileId = String(json.data.fileId ?? '');
      const nextSyncedAt = json.data.syncedAt ?? new Date().toISOString();

      setItems((cur) =>
        cur.map((x) =>
          x._id === it._id
            ? {
                ...x,
                gdriveLink: nextLink,
                gdriveFileId: nextFileId,
                gdriveSyncedAt: nextSyncedAt,
                gdriveSyncError: ''
              }
            : x
        )
      );
      setDetailItem((cur) =>
        cur && cur._id === it._id
          ? {
              ...cur,
              gdriveLink: nextLink,
              gdriveFileId: nextFileId,
              gdriveSyncedAt: nextSyncedAt,
              gdriveSyncError: ''
            }
          : cur
      );

      const copied = await copyTextToClipboard(nextLink);
      setToast({
        kind: 'success',
        title: json.data.cached ? 'GDrive link ready' : 'Synced to Google Drive',
        text: copied ? 'Link copied to clipboard.' : `Copy manual: ${nextLink}`
      });
    } catch {
      setToast({ kind: 'error', title: 'GDrive sync failed', text: 'Network error' });
    } finally {
      setGdriveBusyId(null);
    }
  }

  async function unlinkGdriveLink(it: ArchiveItem) {
    const linked = String(it.gdriveLink ?? '').trim();
    if (!linked) return;

    setError(null);
    setGdriveUnlinkBusyId(it._id);
    try {
      const res = await fetch(`/api/archive/${it._id}/gdrive-link`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        const msg = json?.error || 'Failed to unlink Google Drive file';
        setError(msg);
        setToast({ kind: 'error', title: 'GDrive unlink failed', text: msg });
        return;
      }

      setItems((cur) =>
        cur.map((x) =>
          x._id === it._id
            ? { ...x, gdriveLink: '', gdriveFileId: '', gdriveSyncedAt: null, gdriveSyncError: '' }
            : x
        )
      );
      setDetailItem((cur) =>
        cur && cur._id === it._id ? { ...cur, gdriveLink: '', gdriveFileId: '', gdriveSyncedAt: null, gdriveSyncError: '' } : cur
      );
      setToast({ kind: 'success', title: 'Unlinked', text: 'Google Drive link removed.' });
    } catch {
      setToast({ kind: 'error', title: 'GDrive unlink failed', text: 'Network error' });
    } finally {
      setGdriveUnlinkBusyId(null);
    }
  }

  function openUnlinkConfirm(it: ArchiveItem) {
    setUnlinkConfirmItem(it);
    setUnlinkConfirmOpen(true);
  }

  const gdriveWorkingId = gdriveBusyId || gdriveUnlinkBusyId;
  const gdriveWorkingItem = gdriveWorkingId
    ? items.find((x) => x._id === gdriveWorkingId) || (detailItem && detailItem._id === gdriveWorkingId ? detailItem : null)
    : null;

  function ocrBadgeClass(st?: ArchiveItem['ocrStatus']) {
    if (st === 'done') return 'badge badgeSuccess';
    if (st === 'failed') return 'badge badgeDanger';
    if (st === 'processing') return 'badge badgeInfo';
    if (st === 'pending') return 'badge badgeWarning';
    return 'badge';
  }


  return (
    <AppShell>
      {toast ? (
        <div className="toastWrap">
          <div className={toast.kind === 'success' ? 'toast toastSuccess' : 'toast toastError'}>
            <div className="toastTitle">{toast.title}</div>
            {toast.text ? <div className="toastText">{toast.text}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="container">
        <div className="filesHero">
          <div>
            <h1 className="filesHeroTitle">File Archive</h1>
            <div className="filesHeroSub">Public files and your private files</div>
          </div>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <button className="btn btnSecondary" type="button" onClick={openTrash}>
              Trash
            </button>
            <button className="btn" type="button" onClick={openUpload}>
              Upload
            </button>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {message ? <div style={{ display: 'none' }}>{message}</div> : null}
        {error ? <div style={{ display: 'none' }}>{error}</div> : null}

        <div style={{ height: 12 }} />

        <div className="card cardGlass">
          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ flex: 1, minWidth: 220 }}>
              Search
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="filename…" />
            </label>
            <label style={{ flex: 1, minWidth: 220 }}>
              Doc Number
              <input className="input" value={fDocNumber} onChange={(e) => setFDocNumber(e.target.value)} placeholder="nomor surat…" />
            </label>
            <label style={{ width: 140 }}>
              Per Page
              <select className="input" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button className="btn btnSecondary" onClick={refresh} type="button">
              Refresh
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ width: 200 }}>
              Doc Date From
              <input className="input" type="date" value={fDocFrom} onChange={(e) => setFDocFrom(e.target.value)} />
            </label>
            <label style={{ width: 200 }}>
              Doc Date To
              <input className="input" type="date" value={fDocTo} onChange={(e) => setFDocTo(e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: 220 }}>
              Jenis
              <input className="input" value={fDocKind} onChange={(e) => setFDocKind(e.target.value)} placeholder="SPPD / keuangan…" />
            </label>
            <label style={{ flex: 1, minWidth: 220 }}>
              Kategori
              <select
                className="input"
                value={fRootCategorySlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setFRootCategorySlug(slug);
                  if (!slug) {
                    setFCategory('');
                    return;
                  }
                  const root = categoryMap.get(slug);
                  setFCategory(root ? categoryLabel(root) : '');
                }}
              >
                <option value="">All</option>
                {rootCategories.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: 220 }}>
              Subkategori
              <select
                className="input"
                value={
                  (() => {
                    const root = categoryMap.get(fRootCategorySlug);
                    if (!root) return '';
                    return fCategory && fCategory !== categoryLabel(root) ? fCategory : '';
                  })()
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!fRootCategorySlug) return;
                  const root = categoryMap.get(fRootCategorySlug);
                  if (!v) {
                    setFCategory(root ? categoryLabel(root) : '');
                    return;
                  }
                  setFCategory(v);
                }}
                disabled={!fRootCategorySlug}
              >
                <option value="">{fRootCategorySlug ? '(Semua subkategori)' : 'Pilih kategori dulu'}</option>
                {getDescendantOptions(fRootCategorySlug).map((c) => (
                  <option key={c._id} value={categoryLabel(c)}>
                    {(() => {
                      const root = categoryMap.get(fRootCategorySlug);
                      if (!root) return categoryLabel(c);
                      return categoryLabel(c).replace(`${categoryLabel(root)} / `, '');
                    })()}
                  </option>
                ))}
              </select>
            </label>
            {me && (me.role === 'admin' || me.role === 'staff') ? (
              <button className="btn btnSecondary" type="button" onClick={() => openCategoryModal('filter')} style={{ height: 40 }}>
                + Kategori
              </button>
            ) : null}
            <button
              className="btn btnSecondary"
              type="button"
              onClick={() => {
                window.location.href = `/api/export/archive?${exportQuery}`;
              }}
              style={{ height: 40 }}
            >
              Export Excel
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div className="quickPills">
            <span className="quickPill">
              Total <strong>{meta?.total ?? 0}</strong>
            </span>
            <span className="quickPill">
              Page <strong>{page}</strong> / <strong>{meta?.totalPages ?? 1}</strong>
            </span>
            <span className="quickPill">
              Per Page <strong>{limit}</strong>
            </span>
          </div>

          <div style={{ height: 12 }} />

          {loading ? <div style={{ color: 'var(--muted)' }}>Loading…</div> : null}

          {/* Desktop View: Table */}
          <div className="tableWrap hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 420 }}>File</th>
                  <th style={{ width: 160 }}>No. Arsip</th>
                  <th style={{ width: 110 }}>OCR</th>
                  <th style={{ width: 170 }}>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} onClick={() => openDetail(it)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="fileCellTitle" title={it.title || '-'}>
                        Judul: {it.title?.trim() ? it.title : '-'}
                      </div>
                      <div className="fileCellMeta" title={it.originalName}>
                        File: {it.originalName}
                      </div>
                      {q.trim() && it.searchSnippet ? (
                        <div className="fileCellMeta" style={{ whiteSpace: 'normal', lineHeight: 1.35 }} title={it.searchSnippet}>
                          OCR: {renderSnippet(it.searchSnippet, q)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {(it as any).archiveNumber || '-'}
                    </td>
                    <td>
                      <span className={ocrBadgeClass(it.ocrStatus)}>
                        <span className="badgeDot" />
                        {it.ocrStatus || '-'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(it.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="menuWrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btnSecondary"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            const nextId = openMenu?.id === it._id ? null : it._id;
                            if (nextId) setOpenMenu({ id: it._id, x: Math.round(rect.left), y: Math.round(rect.bottom + 8) });
                            else setOpenMenu(null);
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Accordion */}
          <div className="fileList hide-desktop">
            {items.map((it) => {
              const isExpanded = expandedId === it._id;
              const canEdit = canManageItem(it, me);
              const visibility = itemVisibility(it);

              return (
                <div key={it._id} className={`fileItem ${isExpanded ? 'fileItemExpanded' : ''}`}>
                  <div className="fileItemHeader" onClick={() => setExpandedId(isExpanded ? null : it._id)}>
                    <div className="fileItemTitleArea">
                      <div className="fileItemTitle">
                        {it.title?.trim() ? it.title : it.originalName}
                      </div>
                      <div className="fileItemSubtitle">
                        <span>📅 {new Date(it.createdAt).toLocaleDateString()}</span>
                        <span>📂 {it.category || 'Uncategorized'}</span>
                        <span className={ocrBadgeClass(it.ocrStatus)}>
                          <span className="badgeDot" />
                          {it.ocrStatus || 'pending'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="fileItemContent">
                      <div className="fileItemGrid">
                        <div>
                          <div className="fileDetailLabel">Original Filename</div>
                          <div className="fileDetailValue">{it.originalName}</div>
                        </div>
                        <div>
                          <div className="fileDetailLabel">Nomor Arsip</div>
                          <div className="fileDetailValue">{(it as any).archiveNumber || '-'}</div>
                        </div>
                        <div>
                          <div className="fileDetailLabel">Jenis Dokumen</div>
                          <div className="fileDetailValue">{it.docKind || it.type || '-'}</div>
                        </div>
                        <div>
                          <div className="fileDetailLabel">Nomor Dokumen</div>
                          <div className="fileDetailValue">{it.docNumber || '-'}</div>
                        </div>
                        <div>
                          <div className="fileDetailLabel">Visibility</div>
                          <div className="fileDetailValue" style={{ textTransform: 'capitalize' }}>
                            {visibility} {visibility === 'shared' ? `(${it.sharedWith?.length || 0} users)` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="fileDetailLabel">Size</div>
                          <div className="fileDetailValue">{Math.round(it.size / 1024)} KB</div>
                        </div>
                      </div>

                      {q.trim() && it.searchSnippet ? (
                        <div style={{ marginTop: 16, padding: 12, background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div className="fileDetailLabel">Search Match (OCR)</div>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{renderSnippet(it.searchSnippet, q)}</div>
                        </div>
                      ) : null}

                      <div className="fileItemActions">
                        <button className="btn" onClick={() => openPreview(it)}>Pratinjau</button>
                        <button className="btn btnSecondary" onClick={() => openDetail(it)}>Detail Lengkap</button>
                        {canEdit && (
                          <>
                            <button className="btn btnSecondary" onClick={() => openEdit(it)}>Edit Metadata</button>
                            <button className="btn btnSecondary" onClick={() => {
                              setShareItem(it);
                              setShareVisibility(itemVisibility(it));
                              setShareSelected(it.sharedWith || []);
                              setShareOpen(true);
                            }}>Share</button>
                          </>
                        )}
                        {me && (me.role === 'admin' || isOwnerItem(it, me)) && (
                          <button className="btn btnSecondary" style={{ color: 'var(--danger)' }} onClick={() => openDeleteConfirm(it)}>Delete</button>
                        )}
                        {it.gdriveLink && (
                          <a href={it.gdriveLink} target="_blank" rel="noreferrer" className="btn btnSecondary">Google Drive</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {items.length === 0 && !loading ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <h2 style={{ margin: 0 }}>No files found</h2>
              <p style={{ color: 'var(--muted)' }}>Try adjusting your filters or search keywords.</p>
            </div>
          ) : null}

          <div style={{ height: 12 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--muted)' }}>Total: {meta?.total ?? 0}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btnSecondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <div style={{ color: 'var(--muted)' }}>
                Page {page} / {meta?.totalPages ?? 1}
              </div>
              <button
                className="btn btnSecondary"
                disabled={meta ? page >= meta.totalPages : true}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {uploadOpen ? (
          <div className="modalOverlay" onClick={() => (uploading ? null : setUploadOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Upload File</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setUploadOpen(false)} disabled={uploading}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <button className="btn btnSecondary" type="button" onClick={() => fileRef.current?.click()}>
                  Choose File
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => onChooseUploadFiles(e.target.files ? Array.from(e.target.files) : [])}
                />
                <div style={{ color: 'var(--muted)' }}>{uploadFiles.length ? `${uploadFiles.length} file(s) selected` : 'No file selected'}</div>
              </div>

              {uploadFiles.length ? (
                <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
                  {uploadFiles.slice(0, 6).map((f) => (
                    <div key={`${f.name}-${f.size}-${f.lastModified}`}>{f.name}</div>
                  ))}
                  {uploadFiles.length > 6 ? <div>+{uploadFiles.length - 6} more…</div> : null}
                </div>
              ) : null}

              <div style={{ height: 12 }} />

              <label>
                Judul Dokumen
                <input
                  className="input"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="(opsional) akan diisi otomatis oleh OCR"
                />
              </label>

              <div style={{ height: 12 }} />

              <label>
                Tanggal Surat
                <input
                  className="input"
                  type="datetime-local"
                  value={uploadDocDate}
                  onChange={(e) => setUploadDocDate(e.target.value)}
                />
              </label>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Jenis Dokumen
                  <input
                    className="input"
                    value={uploadDocKind}
                    onChange={(e) => setUploadDocKind(e.target.value)}
                    placeholder="Surat Tugas / SPPD…"
                  />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Doc Number
                  <input
                    className="input"
                    value={uploadDocNumber}
                    onChange={(e) => setUploadDocNumber(e.target.value)}
                    placeholder="Nomor surat…"
                  />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Tags (comma separated)
                  <input
                    className="input"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="penting, 2026"
                  />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Kategori
                  <select
                    className="input"
                    value={uploadRootCategorySlug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setUploadRootCategorySlug(slug);
                      if (!slug) {
                        setUploadCategory('');
                        return;
                      }
                      const root = categoryMap.get(slug);
                      setUploadCategory(root ? categoryLabel(root) : '');
                    }}
                  >
                    <option value="">Select…</option>
                    {rootCategories.map((c) => (
                      <option key={c._id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Subkategori
                  <select
                    className="input"
                    value={
                      (() => {
                        const root = categoryMap.get(uploadRootCategorySlug);
                        if (!root) return '';
                        return uploadCategory && uploadCategory !== categoryLabel(root) ? uploadCategory : '';
                      })()
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!uploadRootCategorySlug) return;
                      const root = categoryMap.get(uploadRootCategorySlug);
                      if (!v) {
                        setUploadCategory(root ? categoryLabel(root) : '');
                        return;
                      }
                      setUploadCategory(v);
                    }}
                    disabled={!uploadRootCategorySlug}
                  >
                    <option value="">{uploadRootCategorySlug ? '(Tidak pilih subkategori)' : 'Pilih kategori dulu'}</option>
                    {getDescendantOptions(uploadRootCategorySlug).map((c) => (
                      <option key={c._id} value={categoryLabel(c)}>
                        {(() => {
                          const root = categoryMap.get(uploadRootCategorySlug);
                          if (!root) return categoryLabel(c);
                          return categoryLabel(c).replace(`${categoryLabel(root)} / `, '');
                        })()}
                      </option>
                    ))}
                  </select>
                </label>
                {me && (me.role === 'admin' || me.role === 'staff') ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    disabled={creatingCategory}
                    onClick={() => openCategoryModal('upload')}
                    style={{ height: 40 }}
                  >
                    {creatingCategory ? 'Creating…' : '+ Kategori'}
                  </button>
                ) : null}
              </div>

              <div style={{ height: 12 }} />

              <label>
                Description
                <textarea className="input" rows={3} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
              </label>

              <div style={{ height: 12 }} />

              <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={uploadPrivate} onChange={(e) => setUploadPrivate(e.target.checked)} />
                Private (hanya terlihat oleh kamu)
              </label>

              <div style={{ height: 12 }} />

              <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={uploadHybridEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUploadHybridEnabled(checked);
                    if (checked) {
                      setUploadOverrides(uploadFiles.map((f, idx) => buildAutoOverride(f, idx, uploadFiles)));
                    }
                  }}
                  disabled={!uploadFiles.length}
                />
                Override metadata per file (hybrid)
              </label>

              {uploadHybridEnabled && uploadFiles.length ? (
                <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 12, padding: 10, maxHeight: 400, overflow: 'auto' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
                    Metadata sudah terisi otomatis. Tinggal sesuaikan yang perlu.
                  </div>
                  {uploadFiles.map((f, idx) => {
                    const ov = uploadOverrides[idx];
                    if (!ov) return null;
                    return (
                      <div key={`${f.name}-${f.size}-${f.lastModified}`} style={{ borderTop: idx ? '1px solid var(--border)' : 'none', paddingTop: idx ? 10 : 0, marginTop: idx ? 10 : 0 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.name}</div>
                        <div className="row" style={{ alignItems: 'end' }}>
                          <label style={{ flex: 1, minWidth: 220 }}>
                            Judul Override
                            <input className="input" value={ov.title} onChange={(e) => updateUploadOverride(idx, { title: e.target.value })} />
                          </label>
                          <label style={{ flex: 1, minWidth: 220 }}>
                            Doc Number Override
                            <input className="input" value={ov.docNumber} onChange={(e) => updateUploadOverride(idx, { docNumber: e.target.value })} />
                          </label>
                        </div>
                        <div style={{ height: 8 }} />
                        <div className="row" style={{ alignItems: 'end' }}>
                          <label style={{ flex: 1, minWidth: 220 }}>
                            Tanggal Surat Override
                            <input className="input" type="datetime-local" value={ov.docDate} onChange={(e) => updateUploadOverride(idx, { docDate: e.target.value })} />
                          </label>
                          <label style={{ flex: 1, minWidth: 220 }}>
                            Jenis Override
                            <input className="input" value={ov.docKind} onChange={(e) => updateUploadOverride(idx, { docKind: e.target.value })} />
                          </label>
                          <label style={{ flex: 1, minWidth: 220 }}>
                            Visibility Override
                            <select className="input" value={ov.visibility} onChange={(e) => updateUploadOverride(idx, { visibility: e.target.value as UploadFileOverride['visibility'] })}>
                              <option value="inherit">Ikuti Global</option>
                              <option value="public">Public</option>
                              <option value="private">Private</option>
                            </select>
                          </label>
                        </div>
                        <div style={{ height: 8 }} />
                        <label>
                          Kategori Override (path)
                          <input
                            className="input"
                            value={ov.category}
                            onChange={(e) => updateUploadOverride(idx, { category: e.target.value })}
                            placeholder="Contoh: Keuangan / SPJ"
                          />
                        </label>
                        <div style={{ height: 8 }} />
                        <label>
                          Tags Override (comma separated)
                          <input className="input" value={ov.tags} onChange={(e) => updateUploadOverride(idx, { tags: e.target.value })} />
                        </label>
                        <div style={{ height: 8 }} />
                        <label>
                          Description Override
                          <textarea className="input" rows={2} value={ov.description} onChange={(e) => updateUploadOverride(idx, { description: e.target.value })} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div style={{ height: 12 }} />

              {uploading ? <div style={{ color: 'var(--muted)' }}>Progress: {progress}%</div> : null}

              <div style={{ height: 12 }} />

              <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                <button className="btn btnPrimary" type="button" onClick={doUpload} disabled={!uploadFiles.length || uploading} style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
                  {uploading ? 'Uploading…' : '🚀 Mulai Unggah'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editOpen ? (
          <div className="modalOverlay" onClick={() => (editSaving ? null : setEditOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Edit Metadata</h3>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setEditId(null);
                  }}
                  disabled={editSaving}
                >
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <label>
                Judul Dokumen
                <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>

              <div style={{ height: 12 }} />

              <label>
                Tanggal Surat
                <input className="input" type="datetime-local" value={editDocDate} onChange={(e) => setEditDocDate(e.target.value)} />
              </label>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Jenis Dokumen
                  <input className="input" value={editDocKind} onChange={(e) => setEditDocKind(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Doc Number
                  <input className="input" value={editDocNumber} onChange={(e) => setEditDocNumber(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Tags (comma separated)
                  <input className="input" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex:  1, minWidth: 220 }}>
                  Kategori
                  <select
                    className="input"
                    value={editRootCategorySlug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setEditRootCategorySlug(slug);
                      if (!slug) {
                        setEditCategory('');
                        return;
                      }
                      const root = categoryMap.get(slug);
                      setEditCategory(root ? categoryLabel(root) : '');
                    }}
                  >
                    <option value="">Select…</option>
                    {rootCategories.map((c) => (
                      <option key={c._id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Subkategori
                  <select
                    className="input"
                    value={
                      (() => {
                        const root = categoryMap.get(editRootCategorySlug);
                        if (!root) return '';
                        return editCategory && editCategory !== categoryLabel(root) ? editCategory : '';
                      })()
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!editRootCategorySlug) return;
                      const root = categoryMap.get(editRootCategorySlug);
                      if (!v) {
                        setEditCategory(root ? categoryLabel(root) : '');
                        return;
                      }
                      setEditCategory(v);
                    }}
                    disabled={!editRootCategorySlug}
                  >
                    <option value="">{editRootCategorySlug ? '(Tidak pilih subkategori)' : 'Pilih kategori dulu'}</option>
                    {getDescendantOptions(editRootCategorySlug).map((c) => (
                      <option key={c._id} value={categoryLabel(c)}>
                        {(() => {
                          const root = categoryMap.get(editRootCategorySlug);
                          if (!root) return categoryLabel(c);
                          return categoryLabel(c).replace(`${categoryLabel(root)} / `, '');
                        })()}
                      </option>
                    ))}
                  </select>
                </label>
                {me && (me.role === 'admin' || me.role === 'staff') ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    disabled={creatingCategory}
                    onClick={() => openCategoryModal('edit')}
                    style={{ height: 40 }}
                  >
                    {creatingCategory ? 'Creating…' : '+ Kategori'}
                  </button>
                ) : null}
              </div>

              <div style={{ height: 12 }} />

              <label>
                Description
                <textarea className="input" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </label>

              <div style={{ height: 12 }} />

              <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={!editIsPublic} onChange={(e) => setEditIsPublic(!e.target.checked)} />
                Private (hanya terlihat oleh kamu)
              </label>

              <div style={{ height: 12 }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {previewOpen ? (
          <div
            className="modalOverlay"
            onClick={() => {
              setPreviewOpen(false);
              setPreviewUrl(null);
              setPreviewMime(null);
            }}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Preview</h3>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    setPreviewUrl(null);
                    setPreviewMime(null);
                  }}
                >
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              {previewUrl ? (
                previewMime?.startsWith('image/') ? (
                  <img src={previewUrl} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
                ) : previewMime === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    style={{ width: '100%', height: 600, borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ color: 'var(--muted)' }}>Preview tidak didukung untuk tipe ini. Silakan Download.</div>
                )
              ) : null}
            </div>
          </div>
        ) : null}

        {openMenu && typeof document !== 'undefined'
          ? createPortal(
              <div
                className="menu menuPopover"
                style={{ left: openMenu.x, top: openMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const it = items.find((x) => x._id === openMenu.id);
                  if (!it) return null;
                  const canEdit = canManageItem(it, me);
                  const canDelete = isOwnerItem(it, me) && me?.role !== 'viewer';
                  const canShare = isOwnerItem(it, me) && me?.role !== 'viewer';
                  return (
                    <>
                      <button
                        className="menuItem"
                        type="button"
                        onClick={() => {
                          openPreview(it);
                          setOpenMenu(null);
                        }}
                      >
                        Preview
                      </button>
                      <a
                        className="menuItem"
                        href={`/api/archive/${it._id}`}
                        onClick={() => {
                          setOpenMenu(null);
                        }}
                      >
                        Download
                      </a>
                      {canEdit ? (
                        <button
                          className="menuItem"
                          type="button"
                          disabled={gdriveBusyId === it._id || gdriveUnlinkBusyId === it._id}
                          onClick={() => {
                            void syncGdriveLink(it);
                            setOpenMenu(null);
                          }}
                        >
                          {gdriveBusyId === it._id ? 'Syncing GDrive…' : 'Get Link GDrive'}
                        </button>
                      ) : null}
                      {it.gdriveLink ? (
                        <a
                          className="menuItem"
                          href={it.gdriveLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            setOpenMenu(null);
                          }}
                        >
                          Open Link GDrive
                        </a>
                      ) : null}
                      {canEdit && it.gdriveLink ? (
                        <button
                          className="menuItem"
                          type="button"
                          disabled={gdriveUnlinkBusyId === it._id || gdriveBusyId === it._id}
                          onClick={() => {
                            openUnlinkConfirm(it);
                            setOpenMenu(null);
                          }}
                        >
                          {gdriveUnlinkBusyId === it._id ? 'Unlinking…' : 'Unlink GDrive'}
                        </button>
                      ) : null}
                      {canEdit ? (
                        <>
                          {canShare ? (
                            <button
                              className="menuItem"
                              type="button"
                              onClick={() => {
                                void openShare(it);
                                setOpenMenu(null);
                              }}
                            >
                              Share
                            </button>
                          ) : null}
                          <button
                            className="menuItem"
                            type="button"
                            onClick={() => {
                              openEdit(it);
                              setOpenMenu(null);
                            }}
                          >
                            Edit
                          </button>
                          {canDelete ? (
                            <button
                              className="menuItem"
                              type="button"
                              onClick={() => {
                                openDeleteConfirm(it);
                                setOpenMenu(null);
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  );
                })()}
              </div>,
              document.body
            )
          : null}

        {deleteOpen ? (
          <div className="modalOverlay" onClick={() => setDeleteOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Delete file?</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setDeleteOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ color: 'var(--muted)' }}>
                This will move <span style={{ fontWeight: 800, color: 'var(--text)' }}>{deleteName}</span> to trash.
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btnSecondary" type="button" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    const id = deleteId;
                    setDeleteOpen(false);
                    setDeleteId(null);
                    setDeleteName('');
                    if (id) await deleteItem(id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {unlinkConfirmOpen && unlinkConfirmItem ? (
          <div className="modalOverlay" onClick={() => (gdriveUnlinkBusyId ? null : setUnlinkConfirmOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Unlink GDrive?</h3>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => setUnlinkConfirmOpen(false)}
                  disabled={Boolean(gdriveUnlinkBusyId)}
                >
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ color: 'var(--muted)' }}>
                File <span style={{ fontWeight: 800, color: 'var(--text)' }}>{unlinkConfirmItem.originalName}</span> akan dihapus dari Google Drive
                dan link di sistem akan dikosongkan.
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => setUnlinkConfirmOpen(false)}
                  disabled={Boolean(gdriveUnlinkBusyId)}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={Boolean(gdriveUnlinkBusyId)}
                  onClick={async () => {
                    const target = unlinkConfirmItem;
                    if (!target) return;
                    await unlinkGdriveLink(target);
                    setUnlinkConfirmOpen(false);
                    setUnlinkConfirmItem(null);
                  }}
                >
                  {gdriveUnlinkBusyId ? 'Unlinking…' : 'Unlink'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {shareOpen && shareItem ? (
          <div className="modalOverlay" onClick={() => (shareSaving ? null : setShareOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Share File</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setShareOpen(false)} disabled={shareSaving}>
                  Close
                </button>
              </div>
              <div style={{ height: 10 }} />
              <div style={{ color: 'var(--muted)' }}>{shareItem.originalName}</div>
              <div style={{ height: 12 }} />

              {shareLoading ? (
                <div style={{ color: 'var(--muted)' }}>Loading share settings…</div>
              ) : (
                <>
                  <label>
                    Visibility
                    <select className="input" value={shareVisibility} onChange={(e) => setShareVisibility(e.target.value as 'public' | 'private' | 'shared')}>
                      <option value="private">Private (owner only)</option>
                      <option value="shared">Shared (selected users)</option>
                      <option value="public">Public (all users)</option>
                    </select>
                  </label>

                  {shareVisibility === 'shared' ? (
                    <>
                      <div style={{ height: 12 }} />
                      <label>
                        Cari User
                        <input
                          className="input"
                          value={shareQuery}
                          onChange={(e) => setShareQuery(e.target.value)}
                          placeholder="Nama / NIP / Phone"
                        />
                      </label>
                      <div style={{ height: 8 }} />
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{shareUsersLoading ? 'Searching users…' : `${shareUsers.length} user ditemukan`}</div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, maxHeight: 160, overflow: 'auto', marginTop: 8 }}>
                        {shareUsers.map((u) => {
                          const selected = shareSelected.some((x) => x.userId === u.userId);
                          return (
                            <label key={u.userId} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <input type="checkbox" checked={selected} onChange={() => toggleShareUser({ userId: u.userId, name: u.name, phone: u.phone })} />
                              <span>
                                {u.name} ({u.phone}) {u.nip ? `- ${u.nip}` : ''}
                              </span>
                            </label>
                          );
                        })}
                        {!shareUsers.length ? <div style={{ color: 'var(--muted)' }}>Tidak ada user.</div> : null}
                      </div>

                      <div style={{ height: 10 }} />
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>User Terpilih</div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, maxHeight: 180, overflow: 'auto' }}>
                        {shareSelected.map((m) => (
                          <div key={m.userId} className="row" style={{ alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              {m.name} ({m.phone})
                            </div>
                            <select className="input" style={{ width: 140 }} value={m.role} onChange={(e) => setShareRole(m.userId, e.target.value as 'viewer' | 'editor')}>
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button className="btn btnSecondary" type="button" onClick={() => toggleShareUser(m)}>
                              Remove
                            </button>
                          </div>
                        ))}
                        {!shareSelected.length ? <div style={{ color: 'var(--muted)' }}>Belum ada user dipilih.</div> : null}
                      </div>
                    </>
                  ) : null}
                </>
              )}

              <div style={{ height: 14 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btnSecondary" type="button" onClick={() => setShareOpen(false)} disabled={shareSaving}>
                  Cancel
                </button>
                <button className="btn" type="button" onClick={saveShare} disabled={shareSaving || shareLoading}>
                  {shareSaving ? 'Saving…' : 'Save Share'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {categoryModalOpen ? (
          <div className="modalOverlay" onClick={() => (creatingCategory ? null : setCategoryModalOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Buat Kategori</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setCategoryModalOpen(false)} disabled={creatingCategory}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <label>
                Nama Kategori
                <input
                  ref={categoryModalInputRef}
                  className="input"
                  value={categoryModalName}
                  onChange={(e) => setCategoryModalName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitCategoryModal();
                    }
                  }}
                  placeholder="contoh: Keuangan"
                />
              </label>

              <div style={{ height: 14 }} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btnSecondary" type="button" onClick={() => setCategoryModalOpen(false)} disabled={creatingCategory}>
                  Cancel
                </button>
                <button className="btn" type="button" onClick={submitCategoryModal} disabled={creatingCategory || !categoryModalName.trim()}>
                  {creatingCategory ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {trashOpen ? (
          <div className="modalOverlay" onClick={() => setTrashOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Trash</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setTrashOpen(false)}>
                  Close
                </button>
              </div>
              <div style={{ height: 10 }} />
              <div style={{ color: 'var(--muted)' }}>
                Items in trash are auto-deleted after {trashMeta?.retentionDays ?? 30} days.
              </div>
              <div style={{ marginTop: 6 }} className="quickPills">
                <span className="quickPill">
                  Total Trash <strong>{trashMeta?.total ?? 0}</strong>
                </span>
              </div>
              <div style={{ height: 12 }} />
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Trashed At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashLoading ? (
                      <tr>
                        <td colSpan={3} style={{ color: '#9ca3af' }}>
                          Loading...
                        </td>
                      </tr>
                    ) : trashItems.length ? (
                      trashItems.map((it) => (
                        <tr key={it._id}>
                          <td>{it.originalName}</td>
                          <td>{it.trashedAt ? new Date(it.trashedAt).toLocaleString() : '-'}</td>
                          <td>
                            <button
                              className="btn btnSecondary"
                              type="button"
                              disabled={restoreBusyId === it._id}
                              onClick={() => {
                                void restoreFromTrashById(it._id);
                              }}
                            >
                              {restoreBusyId === it._id ? 'Restoring…' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ color: '#9ca3af' }}>
                          Trash is empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {detailOpen && detailItem ? (
          <div className="modalOverlay" onClick={() => setDetailOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Detail Dokumen</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setDetailOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ fontWeight: 900, marginBottom: 6 }}>{detailItem.originalName}</div>
              <div style={{ color: 'var(--muted)' }}>{(detailItem as unknown as { archiveNumber?: string }).archiveNumber || '-'}</div>

              <div style={{ height: 12 }} />

              <div className="row">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Judul Dokumen</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.title || detailItem.subject || '-'}</div>
                </div>
                <div style={{ width: 200 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Tanggal Surat</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.docDate ? new Date(detailItem.docDate).toLocaleString() : '-'}</div>
                </div>
                <div style={{ width: 200 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Nomor Surat</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.docNumber || '-'}</div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div className="row">
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Jenis</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.docKind || detailItem.type || '-'}</div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Kategori</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.category || '-'}</div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Visibility</div>
                  <div style={{ fontWeight: 700 }}>{itemVisibility(detailItem).toUpperCase()}</div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>OCR</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.ocrStatus || '-'}</div>
                </div>
                <div style={{ width: 320 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Google Drive</div>
                  <div style={{ fontWeight: 700 }}>
                    {detailItem.gdriveLink ? (
                      <a href={detailItem.gdriveLink} target="_blank" rel="noreferrer">
                        Open Link
                      </a>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div className="row">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Uploader</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.uploadedBy?.name || '-'}</div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Size</div>
                  <div style={{ fontWeight: 700 }}>{Math.round(detailItem.size / 1024)} KB</div>
                </div>
                <div style={{ width: 260 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Uploaded At</div>
                  <div style={{ fontWeight: 700 }}>{new Date(detailItem.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    openPreview(detailItem);
                  }}
                >
                  Preview
                </button>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    window.location.href = `/api/archive/${detailItem._id}`;
                  }}
                >
                  Download
                </button>
                <button
                  className="btn btnSecondary"
                  type="button"
                  disabled={gdriveBusyId === detailItem._id || gdriveUnlinkBusyId === detailItem._id}
                  onClick={() => {
                    void syncGdriveLink(detailItem);
                  }}
                >
                  {gdriveBusyId === detailItem._id ? 'Syncing GDrive…' : 'Get Link GDrive'}
                </button>
                {detailItem.gdriveLink ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    disabled={gdriveUnlinkBusyId === detailItem._id || gdriveBusyId === detailItem._id}
                    onClick={() => {
                      openUnlinkConfirm(detailItem);
                    }}
                  >
                    {gdriveUnlinkBusyId === detailItem._id ? 'Unlinking…' : 'Unlink GDrive'}
                  </button>
                ) : null}
                {detailItem._id ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    disabled={!canManageItem(detailItem, me)}
                    onClick={() => {
                      setDetailOpen(false);
                      openEdit(detailItem);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {detailItem._id && isOwnerItem(detailItem, me) && me?.role !== 'viewer' ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    onClick={() => {
                      setDetailOpen(false);
                      void openShare(detailItem);
                    }}
                  >
                    Share
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {gdriveWorkingId ? (
          <div className="modalOverlay" onClick={() => {}}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                {gdriveBusyId ? 'Syncing to Google Drive…' : 'Unlinking from Google Drive…'}
              </h3>
              <div style={{ color: 'var(--muted)' }}>
                {gdriveWorkingItem?.originalName ? (
                  <>
                    Sedang memproses file: <span style={{ color: 'var(--text)', fontWeight: 800 }}>{gdriveWorkingItem.originalName}</span>
                  </>
                ) : (
                  'Sedang memproses file. Mohon tunggu sebentar.'
                )}
              </div>
              <div style={{ height: 12 }} />
              <div className="quickPills">
                <span className="quickPill">
                  Status <strong>{gdriveBusyId ? 'Syncing' : 'Unlinking'}</strong>
                </span>
                <span className="quickPill">
                  Jangan tutup tab <strong>sebelum selesai</strong>
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <FilesPageContent />
    </Suspense>
  );
}
