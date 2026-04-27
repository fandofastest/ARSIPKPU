'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type LogItem = {
  _id: string;
  archiveId: string;
  originalName: string;
  status: 'processing' | 'done' | 'failed' | 'skipped';
  message?: string;
  createdAt: string;
};

type LogsResp =
  | {
      success: true;
      data: LogItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }
  | { error: string };

type MeResp =
  | {
      success: true;
      data: { role: string };
    }
  | { error: string };

export default function SettingsOcrLogsPage() {
  const [meRole, setMeRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<LogItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);
  const [reprocessingIds, setReprocessingIds] = useState<Record<string, boolean>>({});

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (status.trim()) sp.set('status', status.trim());
    return sp.toString();
  }, [page, limit, status]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [status, limit]);

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

  function refresh() {
    setLoading(true);
    setError(null);
    fetch(`/api/ocr/logs?${query}`, { credentials: 'include' })
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
    if (meRole !== 'admin') return;
    refresh();
  }, [query, meRole]);

  function statusBadgeClass(st: LogItem['status']) {
    if (st === 'done') return 'badge badgeSuccess';
    if (st === 'failed') return 'badge badgeDanger';
    if (st === 'processing') return 'badge badgeInfo';
    if (st === 'skipped') return 'badge badgeWarning';
    return 'badge';
  }

  async function reprocess(archiveId: string) {
    if (!archiveId) return;
    setReprocessingIds((cur) => ({ ...cur, [archiveId]: true }));
    try {
      const res = await fetch(`/api/ocr/reprocess/${archiveId}`, { method: 'POST', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Reprocess failed', text: json?.error || 'Failed to reprocess' });
        return;
      }
      setToast({ kind: 'success', title: 'Reprocess queued', text: 'OCR akan diproses ulang di background.' });
      refresh();
    } catch {
      setToast({ kind: 'error', title: 'Reprocess failed', text: 'Network error' });
    } finally {
      setReprocessingIds((cur) => ({ ...cur, [archiveId]: false }));
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
        <h1 style={{ marginBottom: 6 }}>OCR Logs</h1>
        <div style={{ color: 'var(--muted)' }}>Monitoring hasil OCR dan retry dokumen gagal</div>
        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : (
          <div className="card cardGlass">
            <div className="row" style={{ alignItems: 'end' }}>
              <label style={{ width: 220 }}>
                OCR Status
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="processing">processing</option>
                  <option value="done">done</option>
                  <option value="failed">failed</option>
                  <option value="skipped">skipped</option>
                </select>
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
                    <th>Status</th>
                    <th>File</th>
                    <th>Message</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it._id}>
                      <td style={{ color: 'var(--muted)' }}>{new Date(it.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={statusBadgeClass(it.status)}>
                          <span className="badgeDot" />
                          {it.status}
                        </span>
                      </td>
                      <td>{it.originalName}</td>
                      <td style={{ color: it.status === 'failed' ? '#ef4444' : 'var(--muted)' }}>{it.message || '-'}</td>
                      <td style={{ width: 1, whiteSpace: 'nowrap' }}>
                        {it.status === 'failed' ? (
                          <button
                            className="btn btnSecondary"
                            type="button"
                            onClick={() => reprocess(it.archiveId)}
                            disabled={!!reprocessingIds[it.archiveId]}
                          >
                            {reprocessingIds[it.archiveId] ? 'Reprocessing…' : 'Reprocess'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 18 }}>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>No logs</div>
                        <div style={{ color: 'var(--muted)' }}>OCR activity akan muncul di sini.</div>
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
                <button className="btn btnSecondary" disabled={meta ? page >= meta.totalPages : true} onClick={() => setPage((p) => p + 1)}>
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
