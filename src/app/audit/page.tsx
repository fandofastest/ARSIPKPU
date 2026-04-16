'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type AuditItem = {
  _id: string;
  action: string;
  user: { userId: string; name: string; phone: string; role: string };
  archive: { archiveId?: string | null; archiveNumber?: string; originalName?: string };
  ip?: string;
  userAgent?: string;
  createdAt: string;
  meta?: unknown;
};

type LogsResp =
  | { success: true; data: AuditItem[]; meta: { page: number; limit: number; total: number; totalPages: number } }
  | { error: string };

type MeResp =
  | { success: true; data: { userId: string; name: string; phone: string; role: string } }
  | { error: string };

export default function AuditPage() {
  const [meRole, setMeRole] = useState('');

  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [phone, setPhone] = useState('');
  const [archiveNumber, setArchiveNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState<AuditItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (q.trim()) sp.set('q', q.trim());
    if (action.trim()) sp.set('action', action.trim());
    if (phone.trim()) sp.set('phone', phone.trim());
    if (archiveNumber.trim()) sp.set('archiveNumber', archiveNumber.trim());
    if (from.trim()) sp.set('from', from.trim());
    if (to.trim()) sp.set('to', to.trim());
    return sp.toString();
  }, [page, limit, q, action, phone, archiveNumber, from, to]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [q, action, phone, archiveNumber, from, to, limit]);

  function refresh() {
    setLoading(true);
    setError(null);
    fetch(`/api/audit/logs?${query}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<LogsResp>)
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
        if ('success' in d) setMeRole(d.data.role);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [query]);

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
        <h1 style={{ marginBottom: 6 }}>Audit Trail</h1>
        <div style={{ color: 'var(--muted)' }}>Admin-only activity log</div>

        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : (
          <div className="card cardGlass">
            <div className="row" style={{ alignItems: 'end' }}>
              <label style={{ flex: 1, minWidth: 240 }}>
                Search
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama, phone, nomor arsip, file…" />
              </label>

              <label style={{ width: 160 }}>
                Action
                <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="">All</option>
                  <option value="upload">upload</option>
                  <option value="update">update</option>
                  <option value="delete">delete</option>
                  <option value="download">download</option>
                  <option value="preview">preview</option>
                  <option value="export">export</option>
                  <option value="login">login</option>
                  <option value="category_create">category_create</option>
                  <option value="category_update">category_update</option>
                  <option value="category_delete">category_delete</option>
                </select>
              </label>

              <label style={{ width: 180 }}>
                Phone
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08…" />
              </label>

              <label style={{ width: 200 }}>
                No. Arsip
                <input className="input" value={archiveNumber} onChange={(e) => setArchiveNumber(e.target.value)} placeholder="ARSIP-2026-00001" />
              </label>

              <label style={{ width: 170 }}>
                From
                <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>

              <label style={{ width: 170 }}>
                To
                <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>

              <label style={{ width: 140 }}>
                Per Page
                <select className="input" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <button className="btn btnSecondary" type="button" onClick={refresh}>
                Refresh
              </button>
            </div>

            <div style={{ height: 12 }} />

            {error ? <div style={{ color: '#ef4444' }}>{error}</div> : null}
            {loading ? <div style={{ color: 'var(--muted)' }}>Loading…</div> : null}

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>No. Arsip</th>
                    <th>File</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                {items.map((it) => (
                  <tr key={it._id}>
                    <td style={{ color: 'var(--muted)' }}>{new Date(it.createdAt).toLocaleString()}</td>
                    <td>{it.action}</td>
                    <td>
                      <div style={{ fontWeight: 800 }}>{it.user?.name}</div>
                      <div style={{ color: 'var(--muted)' }}>{it.user?.phone}</div>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{it.archive?.archiveNumber || '-'}</td>
                    <td>{it.archive?.originalName || '-'}</td>
                    <td style={{ color: 'var(--muted)' }}>{it.ip || '-'}</td>
                  </tr>
                ))}

                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 18 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>No logs</div>
                      <div style={{ color: 'var(--muted)' }}>Activity will appear here.</div>
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
        )}
      </div>
    </AppShell>
  );
}
