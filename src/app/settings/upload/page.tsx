'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type MeResp = { success: true; data: { role: string } } | { error: string };
type UploadSettingResp =
  | {
      success: true;
      data: {
        maxFileSizeMb: number;
        allowedExtensions: string[];
      };
    }
  | { error: string };

export default function SettingsUploadPage() {
  const [meRole, setMeRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const [maxFileSizeMb, setMaxFileSizeMb] = useState(100);
  const [allowedExtRaw, setAllowedExtRaw] = useState('pdf, jpg, jpeg, png, docx, xlsx');

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

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/upload', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as UploadSettingResp;
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Gagal load setting upload' });
        return;
      }
      setMaxFileSizeMb(json.data.maxFileSizeMb);
      setAllowedExtRaw(json.data.allowedExtensions.join(', '));
    } catch {
      setToast({ kind: 'error', title: 'Gagal load setting upload', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meRole === 'admin') loadSettings();
  }, [meRole]);

  function parseExtList(raw: string) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function saveSettings() {
    const allowedExtensions = parseExtList(allowedExtRaw);
    if (!allowedExtensions.length) {
      setToast({ kind: 'error', title: 'Ekstensi wajib diisi' });
      return;
    }
    const mb = Number(maxFileSizeMb);
    if (!Number.isFinite(mb) || mb < 1) {
      setToast({ kind: 'error', title: 'Max size tidak valid' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/upload', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxFileSizeMb: mb, allowedExtensions })
      });
      const json = (await res.json().catch(() => ({}))) as UploadSettingResp;
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Gagal simpan setting upload', text: ('error' in json && json.error) || 'Error' });
        return;
      }
      setMaxFileSizeMb(json.data.maxFileSizeMb);
      setAllowedExtRaw(json.data.allowedExtensions.join(', '));
      setToast({ kind: 'success', title: 'Setting upload disimpan' });
    } catch {
      setToast({ kind: 'error', title: 'Gagal simpan setting upload', text: 'Network error' });
    } finally {
      setSaving(false);
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
        <h1 style={{ marginBottom: 6 }}>Upload Settings</h1>
        <div style={{ color: 'var(--muted)' }}>Atur batas ukuran file dan ekstensi yang diperbolehkan.</div>
        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <div className="card cardGlass">
            <div className="row" style={{ alignItems: 'end' }}>
              <label style={{ width: 220 }}>
                Max Size (MB)
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={2048}
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(Number(e.target.value || 1))}
                />
              </label>
              <label style={{ flex: 1, minWidth: 280 }}>
                Ekstensi diperbolehkan (pisah koma)
                <input className="input" value={allowedExtRaw} onChange={(e) => setAllowedExtRaw(e.target.value)} placeholder="pdf, jpg, png, docx" />
              </label>
            </div>

            <div style={{ height: 12 }} />

            <button className="btn" type="button" onClick={saveSettings} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Setting Upload'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

