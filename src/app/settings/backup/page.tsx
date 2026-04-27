'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type MeResp = { success: true; data: { role: string } } | { error: string };
type BackupResp =
  | {
      success: true;
      data: {
        enabled: boolean;
        cron: string;
        keepLast: number;
        backupBaseDir: string;
        projectDir: string;
        envFile: string;
        offsiteRemote: string;
      };
    }
  | { error: string };

export default function SettingsBackupPage() {
  const [meRole, setMeRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [cron, setCron] = useState('30 1 * * *');
  const [keepLast, setKeepLast] = useState(14);
  const [backupBaseDir, setBackupBaseDir] = useState('/home/fando/arsipkpu/backups');
  const [projectDir, setProjectDir] = useState('/home/fando/arsipkpu');
  const [envFile, setEnvFile] = useState('/home/fando/arsipkpu/.env.docker');
  const [offsiteRemote, setOffsiteRemote] = useState('');

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
      const res = await fetch('/api/settings/backup', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as BackupResp;
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Gagal load setting backup' });
        return;
      }
      setEnabled(json.data.enabled);
      setCron(json.data.cron);
      setKeepLast(json.data.keepLast);
      setBackupBaseDir(json.data.backupBaseDir);
      setProjectDir(json.data.projectDir);
      setEnvFile(json.data.envFile);
      setOffsiteRemote(json.data.offsiteRemote);
    } catch {
      setToast({ kind: 'error', title: 'Gagal load setting backup', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meRole === 'admin') loadSettings();
  }, [meRole]);

  async function saveSettings() {
    if (!cron.trim()) {
      setToast({ kind: 'error', title: 'Cron wajib diisi' });
      return;
    }
    if (!backupBaseDir.trim() || !projectDir.trim() || !envFile.trim()) {
      setToast({ kind: 'error', title: 'Path wajib diisi' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/backup', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          cron: cron.trim(),
          keepLast: Number(keepLast),
          backupBaseDir: backupBaseDir.trim(),
          projectDir: projectDir.trim(),
          envFile: envFile.trim(),
          offsiteRemote: offsiteRemote.trim()
        })
      });
      const json = (await res.json().catch(() => ({}))) as BackupResp;
      if (!res.ok || !('success' in json)) {
        setToast({ kind: 'error', title: 'Gagal simpan setting backup' });
        return;
      }
      setToast({ kind: 'success', title: 'Setting backup disimpan' });
    } catch {
      setToast({ kind: 'error', title: 'Gagal simpan setting backup', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  const cronLine = useMemo(() => {
    if (!enabled) return '# Auto backup nonaktif';
    const escapedOffsite = offsiteRemote.trim() ? ` OFFSITE_REMOTE='${offsiteRemote.trim()}'` : '';
    return `${cron.trim()} cd ${projectDir.trim()} && KEEP_LAST=${keepLast}${escapedOffsite} BACKUP_BASE_DIR='${backupBaseDir.trim()}' ENV_FILE='${envFile.trim()}' ./scripts/dr/backup.sh >> /var/log/arsipkpu-backup.log 2>&1`;
  }, [enabled, cron, keepLast, offsiteRemote, projectDir, backupBaseDir, envFile]);

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
        <h1 style={{ marginBottom: 6 }}>Backup & DR Settings</h1>
        <div style={{ color: 'var(--muted)' }}>Atur auto backup, retention, path, dan opsi offsite.</div>
        <div style={{ height: 12 }} />

        {meRole && meRole !== 'admin' ? (
          <div style={{ color: '#ef4444' }}>Forbidden</div>
        ) : loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <>
            <div className="card cardGlass">
              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ width: 220 }}>
                  Auto Backup
                  <select className="input" value={enabled ? '1' : '0'} onChange={(e) => setEnabled(e.target.value === '1')}>
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </label>
                <label style={{ width: 220 }}>
                  Retention (jumlah backup)
                  <input className="input" type="number" min={1} max={365} value={keepLast} onChange={(e) => setKeepLast(Number(e.target.value || 1))} />
                </label>
                <label style={{ flex: 1, minWidth: 280 }}>
                  Cron Schedule
                  <input className="input" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="30 1 * * *" />
                </label>
              </div>

              <div style={{ height: 10 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 280 }}>
                  Project Dir
                  <input className="input" value={projectDir} onChange={(e) => setProjectDir(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 280 }}>
                  ENV File
                  <input className="input" value={envFile} onChange={(e) => setEnvFile(e.target.value)} />
                </label>
              </div>

              <div style={{ height: 10 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 280 }}>
                  Backup Base Dir
                  <input className="input" value={backupBaseDir} onChange={(e) => setBackupBaseDir(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 280 }}>
                  Offsite Remote (optional, rclone)
                  <input className="input" value={offsiteRemote} onChange={(e) => setOffsiteRemote(e.target.value)} placeholder="remote:arsipkpu-backup" />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <button className="btn" type="button" onClick={saveSettings} disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan Setting Backup'}
              </button>
            </div>

            <div style={{ height: 12 }} />

            <div className="card cardGlass">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Contoh Cron Line (copy ke crontab VPS)</div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: 'color-mix(in srgb, var(--secondary) 72%, transparent)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12
                }}
              >
                {cronLine}
              </pre>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
