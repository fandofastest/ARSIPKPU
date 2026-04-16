'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';

type ArchiveItem = {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  type?: string;
  tags?: string[];
  isPublic?: boolean;
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

type MeResp =
  | { success: true; data: { userId: string; name: string; phone: string; role: string } }
  | { error: string };

type UpdateResp =
  | { success: true; data: ArchiveItem }
  | { error: string; details?: unknown };

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

function categoryLabel(c: CategoryItem) {
  return (c.path && c.path.trim()) || c.name;
}

function sortCategory(a: CategoryItem, b: CategoryItem) {
  return categoryLabel(a).localeCompare(categoryLabel(b));
}

export default function FilesPage() {
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
  const [uploadUnitSender, setUploadUnitSender] = useState('');
  const [uploadUnitRecipient, setUploadUnitRecipient] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadRootCategorySlug, setUploadRootCategorySlug] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadPrivate, setUploadPrivate] = useState(false);
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
  const [editUnitSender, setEditUnitSender] = useState('');
  const [editUnitRecipient, setEditUnitRecipient] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRootCategorySlug, setEditRootCategorySlug] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ArchiveItem | null>(null);

  const [openMenu, setOpenMenu] = useState<{ id: string; x: number; y: number } | null>(null);

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
    setUploadUnitSender('');
    setUploadUnitRecipient('');
    setUploadCategory('');
    setUploadDesc('');
    setUploadTags('');
    setUploadPrivate(false);
    setProgress(0);
    setUploadOpen(true);
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
    form.append('unitSender', uploadUnitSender);
    form.append('unitRecipient', uploadUnitRecipient);
    form.append('category', uploadCategory);
    form.append('description', uploadDesc);
    form.append('tags', uploadTags);
    if (uploadPrivate) form.append('private', '1');

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
            setToast({
              kind: 'success',
              title: 'Upload successful',
              text: typeof count === 'number' ? `${count} files uploaded. OCR will process in background.` : 'OCR will process in background.'
            });
            setUploadOpen(false);
            refresh();
          } else {
            setError(json?.error || 'Upload failed');
            setToast({ kind: 'error', title: 'Upload failed', text: json?.error || 'Upload failed' });
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
    setEditIsPublic(it.isPublic !== false);
    setEditDocNumber(it.docNumber || '');
    setEditDocDate(it.docDate ? new Date(it.docDate).toISOString().slice(0, 16) : '');
    setEditDocKind(it.docKind || it.type || '');
    setEditUnitSender(it.unitSender || '');
    setEditUnitRecipient(it.unitRecipient || '');
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
        isPublic: editIsPublic,
        docNumber: editDocNumber,
        docDate: editDocDate.trim() ? editDocDate.trim() : null,
        docKind: editDocKind,
        unitSender: editUnitSender,
        unitRecipient: editUnitRecipient,
        category: editCategory,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      };

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
        <div className="row" style={{ alignItems: 'end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>File</h1>
            <div style={{ color: 'var(--muted)' }}>Public files and your private files</div>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
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

          {loading ? <div style={{ color: 'var(--muted)' }}>Loading…</div> : null}

          <div className="tableWrap">
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
              {items.map((it) => {
                const isOwner =
                  !!me?.userId &&
                  (it.uploadedBy?.userId ? String(it.uploadedBy.userId) === me.userId : it.uploadedBy?.phone === me?.phone);
                const canEdit = isOwner && me?.role !== 'viewer';

                return (
                  <tr key={it._id} onClick={() => openDetail(it)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div
                        style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={it.title || '-'}
                      >
                        Judul: {it.title?.trim() ? it.title : '-'}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.originalName}>
                        File: {it.originalName}
                      </div>
                    </td>
                    <td style={{ color: '#9ca3af', whiteSpace: 'nowrap' }} title={(it as unknown as { archiveNumber?: string }).archiveNumber || ''}>
                      {(it as unknown as { archiveNumber?: string }).archiveNumber || '-'}
                    </td>
                    <td title={it.ocrStatus === 'failed' ? it.ocrError || '' : ''}>
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
                );
              })}

              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18 }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>No files found</div>
                    <div style={{ color: 'var(--muted)' }}>Try adjusting filters, or upload a new document.</div>
                  </td>
                </tr>
              ) : null}
              </tbody>
            </table>
          </div>

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
                  onChange={(e) => setUploadFiles(e.target.files ? Array.from(e.target.files) : [])}
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

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit Pengirim
                  <input className="input" value={uploadUnitSender} onChange={(e) => setUploadUnitSender(e.target.value)} placeholder="Bagian Keuangan…" />
                </label>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit Penerima
                  <input className="input" value={uploadUnitRecipient} onChange={(e) => setUploadUnitRecipient(e.target.value)} placeholder="Sekretariat…" />
                </label>
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

              {uploading ? <div style={{ color: 'var(--muted)' }}>Progress: {progress}%</div> : null}

              <div style={{ height: 12 }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={doUpload} disabled={!uploadFiles.length || uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
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

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit Pengirim
                  <input className="input" value={editUnitSender} onChange={(e) => setEditUnitSender(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit Penerima
                  <input className="input" value={editUnitRecipient} onChange={(e) => setEditUnitRecipient(e.target.value)} />
                </label>
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
                  const isOwner =
                    !!me?.userId &&
                    (it.uploadedBy?.userId ? String(it.uploadedBy.userId) === me.userId : it.uploadedBy?.phone === me?.phone);
                  const canEdit = isOwner && me?.role !== 'viewer';
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
                        <>
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
                  <div style={{ fontWeight: 700 }}>{detailItem.isPublic === false ? 'Private' : 'Public'}</div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>OCR</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.ocrStatus || '-'}</div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div className="row">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Unit Pengirim</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.unitSender || '-'}</div>
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Unit Penerima</div>
                  <div style={{ fontWeight: 700 }}>{detailItem.unitRecipient || '-'}</div>
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
                {detailItem._id ? (
                  <button
                    className="btn btnSecondary"
                    type="button"
                    disabled={!(detailItem.uploadedBy?.userId ? String(detailItem.uploadedBy.userId) === me?.userId : detailItem.uploadedBy?.phone === me?.phone) || me?.role === 'viewer'}
                    onClick={() => {
                      setDetailOpen(false);
                      openEdit(detailItem);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
