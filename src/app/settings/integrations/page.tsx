'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  Cloud,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';

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

type GDriveConfigResp =
  | {
      success: true;
      data: {
        enabled: boolean;
        authType: 'oauth' | 'service_account';
        clientId: string;
        clientSecret: string;
        refreshToken: string;
        folderId: string;
        serviceAccountEmail: string;
        privateKey: string;
        shareMode: 'anyone' | 'domain' | 'private';
        shareDomain: string;
      };
    }
  | { error: string };

export default function SettingsIntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'gdrive' | 'tokens'>('gdrive');
  const [meRole, setMeRole] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  // GDrive Settings State
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveSaving, setGdriveSaving] = useState(false);
  const [gdriveTesting, setGdriveTesting] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [gdriveEnabled, setGdriveEnabled] = useState(false);
  const [gdriveAuthType, setGdriveAuthType] = useState<'oauth' | 'service_account'>('oauth');
  const [gdriveClientId, setGdriveClientId] = useState('');
  const [gdriveClientSecret, setGdriveClientSecret] = useState('');
  const [gdriveRefreshToken, setGdriveRefreshToken] = useState('');
  const [gdriveFolderId, setGdriveFolderId] = useState('');
  const [gdriveServiceAccountEmail, setGdriveServiceAccountEmail] = useState('');
  const [gdrivePrivateKey, setGdrivePrivateKey] = useState('');
  const [gdriveShareMode, setGdriveShareMode] = useState<'anyone' | 'domain' | 'private'>('anyone');
  const [gdriveShareDomain, setGdriveShareDomain] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // App Tokens State
  const [tokenItems, setTokenItems] = useState<IntegrationTokenItem[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState('');
  const [newAppType, setNewAppType] = useState<'app' | 'bot'>('app');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenActingId, setTokenActingId] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState('');

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

  async function loadGDriveSettings() {
    setGdriveLoading(true);
    try {
      const res = await fetch('/api/settings/gdrive', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as GDriveConfigResp;
      if (res.ok && 'success' in json) {
        setGdriveEnabled(Boolean(json.data.enabled));
        setGdriveAuthType(json.data.authType || 'oauth');
        setGdriveClientId(json.data.clientId || '');
        setGdriveClientSecret(json.data.clientSecret || '');
        setGdriveRefreshToken(json.data.refreshToken || '');
        setGdriveFolderId(json.data.folderId || '');
        setGdriveServiceAccountEmail(json.data.serviceAccountEmail || '');
        setGdrivePrivateKey(json.data.privateKey || '');
        setGdriveShareMode(json.data.shareMode || 'anyone');
        setGdriveShareDomain(json.data.shareDomain || '');
      }
    } catch {
      // ignore
    } finally {
      setGdriveLoading(false);
    }
  }

  async function saveGDriveSettings() {
    setGdriveSaving(true);
    setGdriveTestResult(null);
    try {
      const payload = {
        enabled: gdriveEnabled,
        authType: gdriveAuthType,
        clientId: gdriveClientId,
        clientSecret: gdriveClientSecret,
        refreshToken: gdriveRefreshToken,
        folderId: gdriveFolderId,
        serviceAccountEmail: gdriveServiceAccountEmail,
        privateKey: gdrivePrivateKey,
        shareMode: gdriveShareMode,
        shareDomain: gdriveShareDomain
      };

      const res = await fetch('/api/settings/gdrive', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setToast({ kind: 'error', title: 'Gagal simpan', text: json.error || 'Terjadi kesalahan' });
        return;
      }

      setToast({
        kind: 'success',
        title: 'Pengaturan Google Drive disimpan',
        text: gdriveEnabled ? 'Menu Google Drive sekarang ditampilkan di daftar arsip.' : 'Menu Google Drive sekarang disembunyikan.'
      });
    } catch {
      setToast({ kind: 'error', title: 'Gagal simpan', text: 'Gangguan jaringan' });
    } finally {
      setGdriveSaving(false);
    }
  }

  async function testGDriveConnection() {
    setGdriveTesting(true);
    setGdriveTestResult(null);
    try {
      const payload = {
        authType: gdriveAuthType,
        clientId: gdriveClientId,
        clientSecret: gdriveClientSecret,
        refreshToken: gdriveRefreshToken,
        folderId: gdriveFolderId,
        serviceAccountEmail: gdriveServiceAccountEmail,
        privateKey: gdrivePrivateKey,
        shareMode: gdriveShareMode,
        shareDomain: gdriveShareDomain
      };

      const res = await fetch('/api/settings/gdrive/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { message: string; folderName?: string };
        error?: string;
      };

      if (res.ok && json.success) {
        const msg = json.data?.message || 'Koneksi ke Google Drive berhasil!';
        setGdriveTestResult({ ok: true, message: msg });
        setToast({ kind: 'success', title: 'Koneksi Berhasil', text: msg });
      } else {
        const errMsg = json.error || 'Koneksi ke Google Drive gagal';
        setGdriveTestResult({ ok: false, message: errMsg });
        setToast({ kind: 'error', title: 'Tes Koneksi Gagal', text: errMsg });
      }
    } catch {
      const errMsg = 'Tidak dapat menghubungi server untuk tes koneksi';
      setGdriveTestResult({ ok: false, message: errMsg });
      setToast({ kind: 'error', title: 'Gangguan Jaringan', text: errMsg });
    } finally {
      setGdriveTesting(false);
    }
  }

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
    if (meRole === 'admin') {
      loadGDriveSettings();
      refreshIntegrationTokens();
    }
  }, [meRole]);

  async function createIntegrationToken() {
    if (!newAppName.trim()) {
      setToast({ kind: 'error', title: 'Input kurang', text: 'Nama aplikasi wajib diisi' });
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
    const ok = window.confirm('Hapus token permanen? Tindakan ini tidak bisa dibatalkan.');
    if (!ok) return;
    setTokenActingId(id);
    try {
      const res = await fetch(`/api/integrations/tokens/${id}/hard-delete`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setToast({ kind: 'error', title: 'Hapus token gagal', text: json.error || 'Error' });
        return;
      }
      setToast({ kind: 'success', title: 'Token dihapus permanen' });
      refreshIntegrationTokens();
    } catch {
      setToast({ kind: 'error', title: 'Hapus token gagal', text: 'Network error' });
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
        <div className="filesHero">
          <div>
            <h1 className="filesHeroTitle">Integrasi Cloud & API</h1>
            <div className="filesHeroSub">Kelola koneksi penyimpanan Google Drive dan token integrasi aplikasi luar</div>
          </div>
        </div>

        <div style={{ height: 16 }} />

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('gdrive')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'gdrive'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive</span>
            {gdriveEnabled ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Aktif
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Nonaktif
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tokens'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Apps & Tokens</span>
          </button>
        </div>

        {meRole && meRole !== 'admin' ? (
          <div className="alert alertError">
            <div style={{ fontWeight: 900 }}>Akses Dibatasi</div>
            <div className="alertText">Hanya akun Administrator yang dapat mengubah konfigurasi integrasi.</div>
          </div>
        ) : activeTab === 'gdrive' ? (
          /* TAB GOOGLE DRIVE */
          <div className="space-y-6">
            {/* Master Toggle Card */}
            <div className="card cardGlass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span>Tampilkan Menu & Sinkronisasi Google Drive</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Saat opsi ini dimatikan, semua tombol menu <strong>&apos;Ambil Link GDrive&apos;</strong>, <strong>&apos;Buka Link GDrive&apos;</strong>,{' '}
                    <strong>&apos;Unlink GDrive&apos;</strong>, dan badge Google Drive di halaman arsip akan disembunyikan.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gdriveEnabled}
                    onChange={(e) => setGdriveEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                    {gdriveEnabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </label>
              </div>

              {/* Status Test Result Banner */}
              {gdriveTestResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    gdriveTestResult.ok
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  }`}
                >
                  {gdriveTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{gdriveTestResult.ok ? 'Sukses: ' : 'Error: '}</span>
                    <span>{gdriveTestResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Credential Form Card */}
            <div className="card cardGlass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Kredensial & Autentikasi Google Drive</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pilih metode autentikasi yang Anda gunakan. Nilai yang disimpan di sini akan diprioritaskan di atas file .env.
                </p>
              </div>

              {/* Auth Type Selector */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="oauth"
                    checked={gdriveAuthType === 'oauth'}
                    onChange={() => setGdriveAuthType('oauth')}
                  />
                  <span>OAuth 2.0 (Gmail / Akun Pribadi)</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="service_account"
                    checked={gdriveAuthType === 'service_account'}
                    onChange={() => setGdriveAuthType('service_account')}
                  />
                  <span>Service Account (Bot Akun Layanan)</span>
                </label>
              </div>

              {gdriveAuthType === 'oauth' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      OAuth Client ID
                    </label>
                    <input
                      className="input w-full"
                      placeholder="contoh: 260953155028-...apps.googleusercontent.com"
                      value={gdriveClientId}
                      onChange={(e) => setGdriveClientId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      OAuth Client Secret
                    </label>
                    <div className="relative">
                      <input
                        className="input w-full pr-10"
                        type={showSecret ? 'text' : 'password'}
                        placeholder="contoh: GOCSPX-..."
                        value={gdriveClientSecret}
                        onChange={(e) => setGdriveClientSecret(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        OAuth Refresh Token
                      </label>
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>OAuth Playground</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <textarea
                      className="input w-full font-mono text-xs"
                      rows={3}
                      placeholder="Tempel Refresh Token dari Google OAuth Playground (diawali 1//04...)"
                      value={gdriveRefreshToken}
                      onChange={(e) => setGdriveRefreshToken(e.target.value)}
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Pastikan scope OAuth mencakup <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">https://www.googleapis.com/auth/drive</code>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Service Account Email
                    </label>
                    <input
                      className="input w-full"
                      placeholder="contoh: arsipkpu@arsipkpu.iam.gserviceaccount.com"
                      value={gdriveServiceAccountEmail}
                      onChange={(e) => setGdriveServiceAccountEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Private Key
                    </label>
                    <textarea
                      className="input w-full font-mono text-xs"
                      rows={4}
                      placeholder="-----BEGIN PRIVATE KEY-----\nMIIEv...-----END PRIVATE KEY-----"
                      value={gdrivePrivateKey}
                      onChange={(e) => setGdrivePrivateKey(e.target.value)}
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Pastikan folder Google Drive telah dibagikan (*shared*) ke email service account ini dengan hak akses **Editor**.
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Google Drive Folder ID
                  </label>
                  <input
                    className="input w-full"
                    placeholder="contoh: 14qrlIlJGn_Uv6gWV9pMvCIk9BzyhiIjB"
                    value={gdriveFolderId}
                    onChange={(e) => setGdriveFolderId(e.target.value)}
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    ID folder tempat file diunggah (diambil dari URL Google Drive).
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hak Akses Berkas (Share Mode)
                  </label>
                  <select
                    className="input w-full"
                    value={gdriveShareMode}
                    onChange={(e) => setGdriveShareMode(e.target.value as 'anyone' | 'domain' | 'private')}
                  >
                    <option value="anyone">Siapa saja yang memiliki tautan (Publik / Anyone)</option>
                    <option value="domain">Hanya akun satu domain (Google Workspace)</option>
                    <option value="private">Privat (Hanya akun pemilik)</option>
                  </select>
                  {gdriveShareMode === 'domain' && (
                    <input
                      className="input w-full mt-2"
                      placeholder="contoh: kpu.go.id"
                      value={gdriveShareDomain}
                      onChange={(e) => setGdriveShareDomain(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={testGDriveConnection}
                  disabled={gdriveTesting || gdriveSaving}
                  className="btn btnSecondary flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${gdriveTesting ? 'animate-spin' : ''}`} />
                  <span>{gdriveTesting ? 'Mengetes Koneksi…' : 'Tes Koneksi Google Drive'}</span>
                </button>

                <button
                  type="button"
                  onClick={saveGDriveSettings}
                  disabled={gdriveSaving || gdriveTesting}
                  className="btn flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{gdriveSaving ? 'Menyimpan…' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB API TOKENS */
          <div className="card cardGlass">
            <div className="sectionHeader">
              <div>
                <h2 style={{ margin: 0 }}>Daftar App Terdaftar</h2>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Gunakan token berikut untuk integrasi luar</div>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div className="row" style={{ gap: 8, alignItems: 'end' }}>
              <label style={{ flex: 2, minWidth: 200 }}>
                Nama Aplikasi
                <input
                  className="input"
                  placeholder="contoh: WhatsApp Bot, Mobile Scanner"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                />
              </label>

              <label style={{ flex: 1, minWidth: 140 }}>
                Tipe
                <select className="input" value={newAppType} onChange={(e) => setNewAppType(e.target.value as 'app' | 'bot')}>
                  <option value="app">App Client</option>
                  <option value="bot">Bot Worker</option>
                </select>
              </label>

              <label style={{ flex: 1, minWidth: 160 }}>
                Kadaluarsa (Opsional)
                <input
                  className="input"
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                />
              </label>

              <button className="btn" type="button" disabled={tokenCreating} onClick={createIntegrationToken} style={{ height: 40 }}>
                {tokenCreating ? 'Membuat…' : '+ Buat App & Token'}
              </button>
            </div>

            {issuedToken ? (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid #10b981', background: '#ecfdf5' }}>
                <div style={{ fontWeight: 800, color: '#065f46' }}>Token Baru Diterbitkan:</div>
                <div style={{ fontSize: 12, color: '#047857', marginBottom: 8 }}>
                  Salin token sekarang. Token ini tidak akan ditampilkan lagi secara penuh.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" readOnly value={issuedToken} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  <button
                    className="btn btnSecondary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(issuedToken);
                      setToast({ kind: 'success', title: 'Token disalin ke clipboard' });
                    }}
                  >
                    Salin
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ height: 16 }} />

            {tokenLoading ? (
              <div style={{ color: 'var(--muted)' }}>Memuat daftar token…</div>
            ) : tokenError ? (
              <div className="alert alertError">
                <div className="alertText">{tokenError}</div>
              </div>
            ) : tokenItems.length === 0 ? (
              <div style={{ color: 'var(--muted)' }}>Belum ada app terdaftar. Buat app baru untuk mendapatkan token API.</div>
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama App</th>
                      <th>Tipe</th>
                      <th>Status</th>
                      <th>Dibuat</th>
                      <th>Terakhir Dipakai</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenItems.map((item) => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 700 }}>{item.name}</td>
                        <td>{item.appType.toUpperCase()}</td>
                        <td>
                          <span className={item.status === 'active' ? 'badge badgeSuccess' : 'badge badgeDanger'}>
                            <span className="badgeDot" />
                            {item.status}
                          </span>
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td>{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn btnSecondary"
                              type="button"
                              style={{ fontSize: 11, padding: '4px 8px' }}
                              disabled={tokenActingId === item._id}
                              onClick={() => rotateIntegrationToken(item._id)}
                            >
                              Rotate
                            </button>
                            {item.status === 'active' ? (
                              <button
                                className="btn btnSecondary"
                                type="button"
                                style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger)' }}
                                disabled={tokenActingId === item._id}
                                onClick={() => revokeIntegrationToken(item._id)}
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                className="btn btnSecondary"
                                type="button"
                                style={{ fontSize: 11, padding: '4px 8px' }}
                                disabled={tokenActingId === item._id}
                                onClick={() => activateIntegrationToken(item._id)}
                              >
                                Aktifkan
                              </button>
                            )}
                            <button
                              className="btn btnSecondary"
                              type="button"
                              style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger)' }}
                              disabled={tokenActingId === item._id}
                              onClick={() => deleteIntegrationToken(item._id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
