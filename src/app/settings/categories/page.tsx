'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  path?: string;
  description?: string;
  status: 'active' | 'deleted';
};

type MeResp =
  | {
      success: true;
      data: { role: string };
    }
  | { error: string };

export default function SettingsCategoriesPage() {
  const [meRole, setMeRole] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [catItems, setCatItems] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditingName, setCatEditingName] = useState('');
  const [catEditingDesc, setCatEditingDesc] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catActingId, setCatActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json() as Promise<MeResp>)
      .then((d) => {
        if ('success' in d) setMeRole(d.data.role);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  async function refreshCategories() {
    if (meRole !== 'admin') return;
    setCatLoading(true);
    setCatError(null);
    const sp = new URLSearchParams();
    sp.set('includeDeleted', '1');
    if (catStatusFilter === 'active') sp.set('status', 'active');
    if (catStatusFilter === 'deleted') sp.set('status', 'deleted');
    try {
      const res = await fetch(`/api/categories?${sp.toString()}`, { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as
        | { success: true; data: CategoryItem[] }
        | { error: string };
      if (!res.ok || !('success' in json)) {
        setCatError(('error' in json && json.error) || 'Failed to load categories');
        return;
      }
      setCatItems(json.data);
    } catch {
      setCatError('Failed to load categories');
    } finally {
      setCatLoading(false);
    }
  }

  useEffect(() => {
    refreshCategories();
  }, [meRole, catStatusFilter]);

  async function saveCategoryEdit() {
    if (!catEditingId) return;
    setCatSaving(true);
    try {
      const res = await fetch(`/api/categories/${catEditingId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catEditingName, description: catEditingDesc })
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Update category failed', text: json?.error || 'Update failed' });
        return;
      }
      setToast({ kind: 'success', title: 'Category updated', text: catEditingName });
      setCatEditingId(null);
      setCatEditingName('');
      setCatEditingDesc('');
      refreshCategories();
    } catch {
      setToast({ kind: 'error', title: 'Update category failed', text: 'Network error' });
    } finally {
      setCatSaving(false);
    }
  }

  async function deactivateCategory(id: string) {
    setCatActingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Deactivate failed', text: json?.error || 'Deactivate failed' });
        return;
      }
      setToast({ kind: 'success', title: 'Category deactivated' });
      refreshCategories();
    } catch {
      setToast({ kind: 'error', title: 'Deactivate failed', text: 'Network error' });
    } finally {
      setCatActingId(null);
    }
  }

  async function reactivateCategory(id: string) {
    setCatActingId(id);
    try {
      const res = await fetch(`/api/categories/${id}/reactivate`, { method: 'POST', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Reactivate failed', text: json?.error || 'Reactivate failed' });
        return;
      }
      setToast({ kind: 'success', title: 'Category reactivated' });
      refreshCategories();
    } catch {
      setToast({ kind: 'error', title: 'Reactivate failed', text: 'Network error' });
    } finally {
      setCatActingId(null);
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
        <h1 style={{ marginBottom: 6 }}>Category Management</h1>
        <div style={{ color: 'var(--muted)' }}>Rename, deactivate, dan reactivate kategori arsip</div>
        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : (
          <div className="card cardGlass">
            <div className="sectionHeader">
              <div />
              <label style={{ width: 180 }}>
                Status
                <select className="input" value={catStatusFilter} onChange={(e) => setCatStatusFilter(e.target.value as typeof catStatusFilter)}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="deleted">Deleted</option>
                </select>
              </label>
            </div>

            <div style={{ height: 12 }} />
            {catError ? <div style={{ color: '#ef4444' }}>{catError}</div> : null}
            {catLoading ? <div style={{ color: 'var(--muted)' }}>Loading…</div> : null}

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((c) => (
                    <tr key={c._id}>
                      <td>{catEditingId === c._id ? <input className="input" value={catEditingName} onChange={(e) => setCatEditingName(e.target.value)} /> : c.path || c.name}</td>
                      <td style={{ color: 'var(--muted)' }}>{c.slug}</td>
                      <td>
                        <span className={c.status === 'active' ? 'badge badgeSuccess' : 'badge badgeDanger'}>
                          <span className="badgeDot" />
                          {c.status}
                        </span>
                      </td>
                      <td>{catEditingId === c._id ? <input className="input" value={catEditingDesc} onChange={(e) => setCatEditingDesc(e.target.value)} /> : c.description || '-'}</td>
                      <td style={{ width: 1, whiteSpace: 'nowrap' }}>
                        {catEditingId === c._id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btnSecondary" type="button" onClick={() => setCatEditingId(null)} disabled={catSaving}>
                              Cancel
                            </button>
                            <button className="btn" type="button" onClick={saveCategoryEdit} disabled={catSaving || !catEditingName.trim()}>
                              {catSaving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btnSecondary"
                              type="button"
                              onClick={() => {
                                setCatEditingId(c._id);
                                setCatEditingName(c.name);
                                setCatEditingDesc(c.description || '');
                              }}
                            >
                              Rename
                            </button>
                            {c.status === 'active' ? (
                              <button
                                className="btn btnSecondary"
                                type="button"
                                onClick={() => deactivateCategory(c._id)}
                                disabled={catActingId === c._id || c.slug === 'lainnya'}
                              >
                                {catActingId === c._id ? 'Deactivating…' : 'Deactivate'}
                              </button>
                            ) : (
                              <button className="btn btnSecondary" type="button" onClick={() => reactivateCategory(c._id)} disabled={catActingId === c._id}>
                                {catActingId === c._id ? 'Reactivating…' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {catItems.length === 0 && !catLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 18 }}>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>No categories</div>
                        <div style={{ color: 'var(--muted)' }}>Create categories from Archive page.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
