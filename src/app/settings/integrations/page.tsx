'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type IntegrationTokenItem = {
  _id: string;
  name: string;
  appType: 'app' | 'bot';
  status: 'active' | 'revoked';
  scope: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
};

type MeResp =
  | {
      success: true;
      data: { role: string };
    }
  | { error: string };

export default function SettingsIntegrationsPage() {
  const [meRole, setMeRole] = useState('');
  const [tokenItems, setTokenItems] = useState<IntegrationTokenItem[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState('');
  const [newAppType, setNewAppType] = useState<'app' | 'bot'>('app');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenActingId, setTokenActingId] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState('');
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

  async function refreshIntegrationTokens() {
    if (meRole !== 'admin') return;
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await fetch('/api/integrations/tokens?limit=100&page=1', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as
        | { success: true; data: IntegrationTokenItem[] }
        | { error: string };
      if (!res.ok || !('success' in json)) {
        setTokenError(('error' in json && json.error) || 'Failed to load integration tokens');
        return;
      }
      setTokenItems(json.data);
    } catch {
      setTokenError('Failed to load integration tokens');
    } finally {
      setTokenLoading(false);
    }
  }

  useEffect(() => {
    refreshIntegrationTokens();
  }, [meRole]);

  async function createIntegrationToken() {
    if (!newAppName.trim()) {
      setToast({ kind: 'error', title: 'Missing input', text: 'App name wajib diisi' });
      return;
    }
    setTokenCreating(true);
    try {
      const body: Record<string, unknown> = { name: newAppName.trim(), appType: newAppType, scope: ['upload:create'] };
      if (newExpiresAt.trim()) body.expiresAt = new Date(newExpiresAt).toISOString();
      const res = await fetch('/api/integrations/tokens', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => ({}))) as
        | { success: true; data: IntegrationTokenItem & { token?: string } }
        | { error: string };
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Generate token gagal', text: ('error' in json && json.error) || 'Error' });
        return;
      }
      setIssuedToken(String(json.data.token ?? ''));
      setNewAppName('');
      setNewAppType('app');
      setNewExpiresAt('');
      setToast({ kind: 'success', title: 'App & token berhasil dibuat' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Generate token gagal', text: 'Network error' });
    } finally {
      setTokenCreating(false);
    }
  }

  async function rotateIntegrationToken(id: string) {
    setTokenActingId(id);
    try {
      const res = await fetch(`/api/integrations/tokens/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true })
      });
      const json = (await res.json().catch(() => ({}))) as
        | { success: true; data: IntegrationTokenItem & { token?: string } }
        | { error: string };
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Rotate token gagal', text: ('error' in json && json.error) || 'Error' });
        return;
      }
      setIssuedToken(String(json.data.token ?? ''));
      setToast({ kind: 'success', title: 'Token berhasil di-rotate' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Rotate token gagal', text: 'Network error' });
    } finally {
      setTokenActingId(null);
    }
  }

  async function revokeIntegrationToken(id: string) {
    setTokenActingId(id);
    try {
      const res = await fetch(`/api/integrations/tokens/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Revoke token gagal', text: json.error || 'Error' });
        return;
      }
      setToast({ kind: 'success', title: 'Token direvoke' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Revoke token gagal', text: 'Network error' });
    } finally {
      setTokenActingId(null);
    }
  }

  async function activateIntegrationToken(id: string) {
    setTokenActingId(id);
    try {
      const res = await fetch(`/api/integrations/tokens/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Aktifkan token gagal', text: json.error || 'Error' });
        return;
      }
      setToast({ kind: 'success', title: 'Token diaktifkan kembali' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Aktifkan token gagal', text: 'Network error' });
    } finally {
      setTokenActingId(null);
    }
  }

  async function deleteIntegrationToken(id: string) {
    const ok = window.confirm('Delete token permanently? This action cannot be undone.');
    if (!ok) return;
    setTokenActingId(id);
    try {
      const res = await fetch(`/api/integrations/tokens/${id}/hard-delete`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Delete token gagal', text: json.error || 'Error' });
        return;
      }
      setToast({ kind: 'success', title: 'Token dihapus permanen' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Delete token gagal', text: 'Network error' });
    } finally {
      setTokenActingId(null);
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
        <h1 style={{ marginBottom: 6 }}>Integration Apps & Tokens</h1>
        <div style={{ color: 'var(--muted)' }}>Generate app + token untuk integrasi API</div>
        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : (
          <div className="card cardGlass">
            <div className="sectionHeader">
              <div />
              <button className="btn btnSecondary" type="button" onClick={refreshIntegrationTokens}>
                Refresh
              </button>
            </div>

            <div style={{ height: 12 }} />
            <div className="row" style={{ alignItems: 'end' }}>
              <label style={{ width: 260 }}>
                App Name
                <input className="input" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="Contoh: App A" />
              </label>
              <label style={{ width: 180 }}>
                App Type
                <select className="input" value={newAppType} onChange={(e) => setNewAppType(e.target.value as 'app' | 'bot')}>
                  <option value="app">app</option>
                  <option value="bot">bot</option>
                </select>
              </label>
              <label style={{ width: 240 }}>
                Expired At (optional)
                <input className="input" type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
              </label>
              <button className="btn" type="button" onClick={createIntegrationToken} disabled={tokenCreating}>
                {tokenCreating ? 'Generating…' : 'Generate App + Token'}
              </button>
            </div>

            {issuedToken ? (
              <>
                <div style={{ height: 10 }} />
                <div className="card" style={{ borderStyle: 'dashed' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Token baru (simpan sekarang, ditampilkan sekali):</div>
                  <div style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{issuedToken}</div>
                </div>
              </>
            ) : null}

            <div style={{ height: 12 }} />
            {tokenError ? <div style={{ color: '#ef4444' }}>{tokenError}</div> : null}
            {tokenLoading ? <div style={{ color: 'var(--muted)' }}>Loading…</div> : null}

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scope</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tokenItems.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{t.name}</div>
                        <div style={{ color: 'var(--muted)' }}>{new Date(t.createdAt).toLocaleString()}</div>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{t.appType || 'app'}</td>
                      <td>
                        <span className={t.status === 'active' ? 'badge badgeSuccess' : 'badge badgeDanger'}>
                          <span className="badgeDot" />
                          {t.status}
                        </span>
                      </td>
                      <td>{Array.isArray(t.scope) ? t.scope.join(', ') : '-'}</td>
                      <td style={{ color: 'var(--muted)' }}>{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : '-'}</td>
                      <td style={{ color: 'var(--muted)' }}>{t.expiresAt ? new Date(t.expiresAt).toLocaleString() : '-'}</td>
                      <td style={{ width: 1, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btnSecondary" type="button" onClick={() => rotateIntegrationToken(t._id)} disabled={tokenActingId === t._id}>
                            {tokenActingId === t._id ? 'Working…' : 'Rotate'}
                          </button>
                          {t.status === 'active' ? (
                            <button className="btn btnSecondary" type="button" onClick={() => revokeIntegrationToken(t._id)} disabled={tokenActingId === t._id}>
                              Revoke
                            </button>
                          ) : (
                            <button className="btn btnSecondary" type="button" onClick={() => activateIntegrationToken(t._id)} disabled={tokenActingId === t._id}>
                              Activate
                            </button>
                          )}
                          <button className="btn btnSecondary" type="button" onClick={() => deleteIntegrationToken(t._id)} disabled={tokenActingId === t._id}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tokenItems.length === 0 && !tokenLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 18 }}>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>No integration apps</div>
                        <div style={{ color: 'var(--muted)' }}>Generate app + token dari form di atas.</div>
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
