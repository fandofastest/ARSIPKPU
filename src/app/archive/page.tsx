'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';

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
  unit?: string;
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

export default function ArchivePage() {
  const [me, setMe] = useState<{ userId: string; phone: string; role: string } | null>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docFrom, setDocFrom] = useState('');
  const [docTo, setDocTo] = useState('');
  const [docKind, setDocKind] = useState('');
  const [category, setCategory] = useState('');
  const [rootCategorySlug, setRootCategorySlug] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  function nowLocalDateTimeValue() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalName, setCategoryModalName] = useState('');
  const [categoryModalTarget, setCategoryModalTarget] = useState<'filter' | 'edit'>('edit');
  const categoryModalInputRef = useRef<HTMLInputElement | null>(null);

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

  function ocrBadgeClass(st?: ArchiveItem['ocrStatus']) {
    if (st === 'done') return 'badge badgeSuccess';
    if (st === 'failed') return 'badge badgeDanger';
    if (st === 'processing') return 'badge badgeInfo';
    if (st === 'pending') return 'badge badgeWarning';
    return 'badge';
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [q, tag, docNumber, docFrom, docTo, docKind, category, limit]);

  useEffect(() => {
    setRootCategorySlug(getRootSlugByValue(category));
  }, [category, categories]);

  useEffect(() => {
    setEditRootCategorySlug(getRootSlugByValue(editCategory));
  }, [editCategory, categories]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (q.trim()) sp.set('q', q.trim());
    if (tag.trim()) sp.set('tag', tag.trim());
    if (docNumber.trim()) sp.set('docNumber', docNumber.trim());
    if (docFrom.trim()) sp.set('docFrom', docFrom.trim());
    if (docTo.trim()) sp.set('docTo', docTo.trim());
    if (docKind.trim()) sp.set('docKind', docKind.trim());
    if (category.trim()) sp.set('category', category.trim());
    return sp.toString();
  }, [page, limit, q, tag, docNumber, docFrom, docTo, docKind, category]);

  const exportQuery = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (tag.trim()) sp.set('tag', tag.trim());
    if (docNumber.trim()) sp.set('docNumber', docNumber.trim());
    if (docFrom.trim()) sp.set('docFrom', docFrom.trim());
    if (docTo.trim()) sp.set('docTo', docTo.trim());
    if (docKind.trim()) sp.set('docKind', docKind.trim());
    if (category.trim()) sp.set('category', category.trim());
    sp.set('limit', '10000');
    return sp.toString();
  }, [q, tag, docNumber, docFrom, docTo, docKind, category]);

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
        if ('success' in d) {
          setMe({ userId: d.data.userId, phone: d.data.phone, role: d.data.role });
        }
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

  function openCategoryModal(target: 'filter' | 'edit') {
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
    if (categoryModalTarget === 'filter') setCategory(r.name);
    if (categoryModalTarget === 'edit') setEditCategory(r.name);
    setCategoryModalOpen(false);
  }

  useEffect(() => {
    refresh();
  }, [query]);

  function openEdit(it: ArchiveItem) {
    setEditId(it._id);
    setEditTitle((it as unknown as { title?: string; subject?: string }).title || it.subject || '');
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
    if (!confirm('Hapus file ini? (akan dipindahkan ke trash)')) return;
    setError(null);
    try {
      const res = await fetch(`/api/archive/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json()) as { success?: true; error?: string };
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
        <h1>Archive</h1>

        <div className="card cardGlass">
          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ flex: 1, minWidth: 240 }}>
              Search
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="filename…" />
            </label>
            <label style={{ width: 220 }}>
              Doc Number
              <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="nomor surat…" />
            </label>
            <label style={{ width: 180 }}>
              Jenis
              <input className="input" value={docKind} onChange={(e) => setDocKind(e.target.value)} placeholder="SPPD / Keuangan…" />
            </label>
            <label style={{ width: 180 }}>
              Kategori
              <select
                className="input"
                value={rootCategorySlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setRootCategorySlug(slug);
                  if (!slug) {
                    setCategory('');
                    return;
                  }
                  const root = categoryMap.get(slug);
                  setCategory(root ? categoryLabel(root) : '');
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
            <label style={{ width: 220 }}>
              Subkategori
              <select
                className="input"
                value={
                  (() => {
                    const root = categoryMap.get(rootCategorySlug);
                    if (!root) return '';
                    return category && category !== categoryLabel(root) ? category : '';
                  })()
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (!rootCategorySlug) return;
                  const root = categoryMap.get(rootCategorySlug);
                  if (!v) {
                    setCategory(root ? categoryLabel(root) : '');
                    return;
                  }
                  setCategory(v);
                }}
                disabled={!rootCategorySlug}
              >
                <option value="">{rootCategorySlug ? '(Semua subkategori)' : 'Pilih kategori dulu'}</option>
                {getDescendantOptions(rootCategorySlug).map((c) => (
                  <option key={c._id} value={categoryLabel(c)}>
                    {(() => {
                      const root = categoryMap.get(rootCategorySlug);
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
            <label style={{ width: 180 }}>
              Tag
              <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="penting" />
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
              <input className="input" type="date" value={docFrom} onChange={(e) => setDocFrom(e.target.value)} />
            </label>
            <label style={{ width: 200 }}>
              Doc Date To
              <input className="input" type="date" value={docTo} onChange={(e) => setDocTo(e.target.value)} />
            </label>
          </div>

          <div style={{ height: 12 }} />

          {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
          {loading ? <div style={{ color: '#9ca3af' }}>Loading…</div> : null}

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>No. Arsip</th>
                  <th>Doc No</th>
                  <th>Doc Date</th>
                  <th>OCR</th>
                  <th>Visibility</th>
                  <th>Jenis</th>
                  <th>Tags</th>
                  <th>Uploader</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
              {items.map((it) => {
                const isOwner =
                  !!me?.userId &&
                  (it.uploadedBy?.userId ? String(it.uploadedBy.userId) === me.userId : it.uploadedBy?.phone === me?.phone);

                const kind = (it.docKind || it.type || '').trim();

                return (
                  <tr key={it._id}>
                    <td>
                      <div style={{ fontWeight: 800, marginBottom: 2 }}>{it.originalName}</div>
                      <div className="chipRow">
                        {kind ? <span className="chip chipStrong">{kind}</span> : null}
                        {it.category ? <span className="chip">{it.category}</span> : null}
                        {it.year ? <span className="chip">{it.year}</span> : null}
                        {(it.tags ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="chip">
                            {t}
                          </span>
                        ))}
                        {(it.tags?.length ?? 0) > 3 ? <span className="chip">+{(it.tags?.length ?? 0) - 3}</span> : null}
                      </div>
                    </td>
                    <td style={{ color: '#9ca3af' }}>{(it as unknown as { archiveNumber?: string }).archiveNumber || '-'}</td>
                    <td style={{ color: '#9ca3af' }}>{it.docNumber || '-'}</td>
                    <td style={{ color: '#9ca3af' }}>{it.docDate ? new Date(it.docDate).toLocaleDateString() : '-'}</td>
                    <td title={it.ocrStatus === 'failed' ? it.ocrError || '' : ''}>
                      <span className={ocrBadgeClass(it.ocrStatus)}>
                        <span className="badgeDot" />
                        {it.ocrStatus || '-'}
                      </span>
                    </td>
                    <td style={{ color: '#9ca3af' }}>{it.isPublic === false ? 'Private' : 'Public'}</td>
                    <td style={{ color: '#9ca3af' }}>{kind || '-'}</td>
                    <td style={{ color: '#9ca3af' }}>{it.tags?.length ? it.tags.join(', ') : '-'}</td>
                    <td>{it.uploadedBy?.name}</td>
                    <td>{Math.round(it.size / 1024)} KB</td>
                    <td>{new Date(it.createdAt).toLocaleString()}</td>
                    <td>
                      <a className="btn btnSecondary" href={`/api/archive/${it._id}`}>
                        Download
                      </a>
                      {isOwner ? (
                        <>
                          <span style={{ display: 'inline-block', width: 8 }} />
                          <button className="btn btnSecondary" type="button" onClick={() => openEdit(it)}>
                            Edit
                          </button>
                          <span style={{ display: 'inline-block', width: 8 }} />
                          <button className="btn btnSecondary" type="button" onClick={() => deleteItem(it._id)}>
                            Delete
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: 18 }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>No results</div>
                    <div style={{ color: 'var(--muted)' }}>Try adjusting filters, or search using OCR text / document metadata.</div>
                  </td>
                </tr>
              ) : null}
              </tbody>
            </table>
          </div>

          {editOpen ? (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ height: 12 }} />

              <label>
                Judul Dokumen
                <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>

              <div style={{ height: 12 }} />

              <label>
                Tanggal Surat
                <input
                  className="input"
                  type="datetime-local"
                  value={editDocDate}
                  onChange={(e) => setEditDocDate(e.target.value)}
                />
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
                <label style={{ flex: 1, minWidth: 220 }}>
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
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setEditId(null);
                  }}
                  disabled={editSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {categoryModalOpen ? (
            <div className="modalOverlay" onClick={() => (creatingCategory ? null : setCategoryModalOpen(false))}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Buat Kategori</h3>
                  <button
                    className="btn btnSecondary"
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    disabled={creatingCategory}
                  >
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
                  <button
                    className="btn btnSecondary"
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    disabled={creatingCategory}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={submitCategoryModal}
                    disabled={creatingCategory || !categoryModalName.trim()}
                  >
                    {creatingCategory ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ height: 12 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#9ca3af' }}>Total: {meta?.total ?? 0}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btnSecondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <div style={{ color: '#9ca3af' }}>
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
      </div>
    </AppShell>
  );
}
