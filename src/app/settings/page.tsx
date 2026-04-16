'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type LogItem = {
  _id: string;
  archiveId: string;
  originalName: string;
  mimeType: string;
  status: 'processing' | 'done' | 'failed' | 'skipped';
  message?: string;
  startedAt: string;
  finishedAt?: string | null;
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
      data: {
        userId: string;
        name: string;
        nama?: string | null;
        nip?: string | null;
        golongan?: string | null;
        jabatan?: string | null;
        phone: string;
        role: string;
        unit?: string | null;
        email?: string | null;
        gender?: 'male' | 'female' | 'other' | null;
        address?: string | null;
      };
    }
  | { error: string };

type ProfileResp =
  | {
      success: true;
      data: {
        _id: string;
        nama: string;
        nip?: string | null;
        golongan?: string | null;
        jabatan?: string | null;
        phone: string;
        role: string;
        unit?: string | null;
        email?: string | null;
        gender?: 'male' | 'female' | 'other' | null;
        address?: string | null;
        createdAt: string;
      };
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
  status: 'active' | 'deleted';
};

type IntegrationTokenItem = {
  _id: string;
  name: string;
  appType: 'app' | 'bot';
  status: 'active' | 'revoked';
  scope: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  lastUsedIp?: string;
  createdBy: { userId: string; name: string; phone: string };
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [meRole, setMeRole] = useState<string>('');
  const [meUser, setMeUser] = useState<{
    userId: string;
    nama: string;
    nip?: string | null;
    golongan?: string | null;
    jabatan?: string | null;
    phone: string;
    role: string;
    unit?: string | null;
    email?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
    address?: string | null;
  } | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileUnit, setProfileUnit] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileGender, setProfileGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [profileAddress, setProfileAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState<LogItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; title: string; text?: string } | null>(null);

  const [reprocessingIds, setReprocessingIds] = useState<Record<string, boolean>>({});
  const [catStatusFilter, setCatStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [catItems, setCatItems] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catEditingName, setCatEditingName] = useState('');
  const [catEditingDesc, setCatEditingDesc] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catActingId, setCatActingId] = useState<string | null>(null);
  const [tokenItems, setTokenItems] = useState<IntegrationTokenItem[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState('');
  const [newAppType, setNewAppType] = useState<'app' | 'bot'>('app');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenActingId, setTokenActingId] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState('');

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (status.trim()) sp.set('status', status.trim());
    return sp.toString();
  }, [page, limit, status]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [status, limit]);

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
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json() as Promise<MeResp>)
      .then((d) => {
        if ('success' in d) {
          setMeRole(d.data.role);
          setMeUser({
            ...d.data,
            nama: d.data.nama || d.data.name
          });
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  async function refreshProfile() {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as ProfileResp;
      if (!res.ok || !('success' in json)) return;
      setProfileName(json.data.nama || '');
      setProfileUnit(json.data.unit || '');
      setProfileEmail(json.data.email || '');
      setProfileGender((json.data.gender as '' | 'male' | 'female' | 'other' | null) || '');
      setProfileAddress(json.data.address || '');
      setMeUser((cur) =>
        cur
          ? {
              ...cur,
              nama: json.data.nama,
              nip: json.data.nip,
              golongan: json.data.golongan,
              jabatan: json.data.jabatan,
              phone: json.data.phone,
              role: json.data.role,
              unit: json.data.unit,
              email: json.data.email,
              gender: json.data.gender as 'male' | 'female' | 'other' | null | undefined,
              address: json.data.address
            }
          : null
      );
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!meRole) return;
    refreshProfile();
  }, [meRole]);

  useEffect(() => {
    refresh();
  }, [query]);

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
        const msg = json?.error || 'Failed to reprocess';
        setToast({ kind: 'error', title: 'Reprocess failed', text: msg });
        return;
      }
      setToast({ kind: 'success', title: 'Reprocess queued', text: 'OCR will retry in background.' });
      refresh();
    } catch {
      setToast({ kind: 'error', title: 'Reprocess failed', text: 'Network error' });
    } finally {
      setReprocessingIds((cur) => ({ ...cur, [archiveId]: false }));
    }
  }

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

  async function createIntegrationToken() {
    if (!newAppName.trim()) {
      setToast({ kind: 'error', title: 'Missing input', text: 'App name wajib diisi' });
      return;
    }
    setTokenCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: newAppName.trim(),
        appType: newAppType,
        scope: ['upload:create']
      };
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

  async function saveProfile() {
    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim().toLowerCase();
    if (!trimmedName) {
      setToast({ kind: 'error', title: 'Nama wajib diisi' });
      return;
    }
    if (trimmedEmail) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(trimmedEmail)) {
        setToast({ kind: 'error', title: 'Format email tidak valid' });
        return;
      }
    }
    if (newPassword && newPassword.length < 6) {
      setToast({ kind: 'error', title: 'Password baru minimal 6 karakter' });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setToast({ kind: 'error', title: 'Konfirmasi password tidak sama' });
      return;
    }
    if (newPassword && !currentPassword) {
      setToast({ kind: 'error', title: 'Password saat ini wajib diisi' });
      return;
    }

    setProfileSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama: trimmedName,
        unit: profileUnit.trim(),
        email: trimmedEmail,
        gender: profileGender,
        address: profileAddress.trim()
      };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => ({}))) as ProfileResp;
      if (!res.ok || !('success' in json)) {
        const msg = 'error' in json ? json.error : 'Gagal menyimpan profil';
        setToast({ kind: 'error', title: 'Gagal menyimpan profil', text: msg });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMeUser((cur) =>
        cur
          ? {
              ...cur,
              nama: json.data.nama,
              nip: json.data.nip,
              golongan: json.data.golongan,
              jabatan: json.data.jabatan,
              unit: json.data.unit,
              email: json.data.email,
              gender: json.data.gender as 'male' | 'female' | 'other' | null | undefined,
              address: json.data.address
            }
          : cur
      );
      setToast({ kind: 'success', title: 'Profil berhasil diperbarui' });
      refreshProfile();
    } catch {
      setToast({ kind: 'error', title: 'Gagal menyimpan profil', text: 'Network error' });
    } finally {
      setProfileSaving(false);
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
        <h1 style={{ marginBottom: 6 }}>Pengaturan Profil</h1>
        <div style={{ color: 'var(--muted)' }}>Kelola data pegawai KPU dan keamanan akun</div>

        <div style={{ height: 12 }} />

        <div className="card cardGlass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Profil Pegawai</h2>
              <div style={{ color: 'var(--muted)' }}>Perbarui nama, unit kerja, email, jenis kelamin, alamat, dan password akun Anda</div>
            </div>
            {meUser ? (
              <span className="badge badgeInfo">
                <span className="badgeDot" />
                {meUser.role}
              </span>
            ) : null}
          </div>

          <div style={{ height: 12 }} />

          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ width: 280 }}>
              Nama Lengkap
              <input className="input" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Nama pegawai" />
            </label>
            <label style={{ width: 220 }}>
              Nomor HP (Login)
              <input className="input" value={meUser?.phone || ''} disabled />
            </label>
            <label style={{ width: 240 }}>
              Unit Kerja
              <input className="input" value={profileUnit} onChange={(e) => setProfileUnit(e.target.value)} placeholder="Contoh: Divisi Teknis" />
            </label>
            <label style={{ width: 280 }}>
              Email
              <input className="input" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="contoh@kpu.go.id" />
            </label>
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ width: 220 }}>
              Jenis Kelamin
              <select className="input" value={profileGender} onChange={(e) => setProfileGender(e.target.value as '' | 'male' | 'female' | 'other')}>
                <option value="">- Pilih -</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
                <option value="other">Lainnya</option>
              </select>
            </label>
            <label style={{ width: 540 }}>
              Alamat
              <input className="input" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} placeholder="Alamat domisili pegawai" />
            </label>
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ width: 220 }}>
              Password Saat Ini
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••" />
            </label>
            <label style={{ width: 220 }}>
              Password Baru
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
            </label>
            <label style={{ width: 220 }}>
              Konfirmasi Password
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
            </label>
            <button className="btn" type="button" onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? 'Menyimpan…' : 'Simpan Profil'}
            </button>
          </div>
        </div>

        {meRole === 'admin' ? (
          <>
            <div style={{ height: 16 }} />
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
                          <div style={{ color: 'var(--muted)' }}>OCR activity will appear here as documents are processed.</div>
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

            <div style={{ height: 16 }} />

            <div className="card cardGlass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>Category Management</h2>
                  <div style={{ color: 'var(--muted)' }}>Rename, deactivate, and reactivate categories</div>
                </div>
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
                        <td>
                          {catEditingId === c._id ? (
                            <input className="input" value={catEditingName} onChange={(e) => setCatEditingName(e.target.value)} />
                          ) : (
                            c.path || c.name
                          )}
                        </td>
                        <td style={{ color: 'var(--muted)' }}>{c.slug}</td>
                        <td>
                          <span className={c.status === 'active' ? 'badge badgeSuccess' : 'badge badgeDanger'}>
                            <span className="badgeDot" />
                            {c.status}
                          </span>
                        </td>
                        <td>
                          {catEditingId === c._id ? (
                            <input className="input" value={catEditingDesc} onChange={(e) => setCatEditingDesc(e.target.value)} />
                          ) : (
                            c.description || '-'
                          )}
                        </td>
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
                                <button
                                  className="btn btnSecondary"
                                  type="button"
                                  onClick={() => reactivateCategory(c._id)}
                                  disabled={catActingId === c._id}
                                >
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

            <div style={{ height: 16 }} />

            <div className="card cardGlass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>Integration Apps & Tokens</h2>
                  <div style={{ color: 'var(--muted)' }}>Generate app + token dari admin</div>
                </div>
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
                    <div style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                      {issuedToken}
                    </div>
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
                            <button
                              className="btn btnSecondary"
                              type="button"
                              onClick={() => rotateIntegrationToken(t._id)}
                              disabled={tokenActingId === t._id}
                            >
                              {tokenActingId === t._id ? 'Working…' : 'Rotate'}
                            </button>
                            {t.status === 'active' ? (
                              <button
                                className="btn btnSecondary"
                                type="button"
                                onClick={() => revokeIntegrationToken(t._id)}
                                disabled={tokenActingId === t._id}
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                className="btn btnSecondary"
                                type="button"
                                onClick={() => activateIntegrationToken(t._id)}
                                disabled={tokenActingId === t._id}
                              >
                                Activate
                              </button>
                            )}
                            <button
                              className="btn btnSecondary"
                              type="button"
                              onClick={() => deleteIntegrationToken(t._id)}
                              disabled={tokenActingId === t._id}
                            >
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
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
