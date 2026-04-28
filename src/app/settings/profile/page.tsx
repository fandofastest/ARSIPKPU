'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

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
        profileComplete?: boolean;
        missingProfileFields?: string[];
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

export default function SettingsProfilePage() {
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
  const [profileNip, setProfileNip] = useState('');
  const [profileGolongan, setProfileGolongan] = useState('');
  const [profileJabatan, setProfileJabatan] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileUnit, setProfileUnit] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileGender, setProfileGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [profileAddress, setProfileAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
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
        if ('success' in d) {
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
      setProfileNip(String(json.data.nip ?? ''));
      setProfileGolongan(String(json.data.golongan ?? ''));
      setProfileJabatan(String(json.data.jabatan ?? ''));
      setProfilePhone(String(json.data.phone ?? ''));
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
    refreshProfile();
  }, []);

  async function saveProfile() {
    const trimmedName = profileName.trim();
    const trimmedNip = profileNip.trim();
    const trimmedGolongan = profileGolongan.trim();
    const trimmedJabatan = profileJabatan.trim();
    const trimmedPhone = profilePhone.trim();
    const trimmedEmail = profileEmail.trim().toLowerCase();
    const trimmedUnit = profileUnit.trim();
    const trimmedAddress = profileAddress.trim();
    const requiredMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('required') === '1';
    if (!trimmedName) {
      setToast({ kind: 'error', title: 'Nama wajib diisi' });
      return;
    }
    if (!trimmedNip) {
      setToast({ kind: 'error', title: 'NIP wajib diisi' });
      return;
    }
    if (!trimmedGolongan) {
      setToast({ kind: 'error', title: 'Golongan wajib diisi' });
      return;
    }
    if (!trimmedJabatan) {
      setToast({ kind: 'error', title: 'Jabatan wajib diisi' });
      return;
    }
    if (!trimmedPhone) {
      setToast({ kind: 'error', title: 'Nomor HP wajib diisi' });
      return;
    }
    if (!trimmedUnit) {
      setToast({ kind: 'error', title: 'Unit kerja wajib diisi' });
      return;
    }
    if (!trimmedEmail) {
      setToast({ kind: 'error', title: 'Email wajib diisi' });
      return;
    }
    if (!profileGender) {
      setToast({ kind: 'error', title: 'Jenis kelamin wajib diisi' });
      return;
    }
    if (!trimmedAddress) {
      setToast({ kind: 'error', title: 'Alamat wajib diisi' });
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
        nip: trimmedNip,
        golongan: trimmedGolongan,
        jabatan: trimmedJabatan,
        phone: trimmedPhone,
        unit: trimmedUnit,
        email: trimmedEmail,
        gender: profileGender,
        address: trimmedAddress
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
        <div className="pageHero">
          <div>
            <h1 style={{ margin: 0 }}>Pengaturan Profil</h1>
            <div className="pageHeroText">Kelola data pegawai KPU dan keamanan akun</div>
          </div>
          {meUser ? (
            <span className="badge badgeInfo">
              <span className="badgeDot" />
              {meUser.role}
            </span>
          ) : null}
        </div>

        <div style={{ height: 12 }} />

        <div className="card cardGlass">
          <div className="sectionHeader">
            <div>
              <h2 className="sectionTitle">Profil Pegawai</h2>
              <div style={{ color: 'var(--muted)' }}>Perbarui nama, unit kerja, email, jenis kelamin, alamat, dan password akun Anda</div>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="row" style={{ alignItems: 'end' }}>
            <label style={{ width: 280 }}>
              Nama Lengkap
              <input className="input" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Nama pegawai" />
            </label>
            <label style={{ width: 220 }}>
              NIP (Login)
              <input className="input" value={profileNip} onChange={(e) => setProfileNip(e.target.value)} placeholder="Masukkan NIP" />
            </label>
            <label style={{ width: 220 }}>
              Nomor HP
              <input className="input" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx" />
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
              Golongan
              <input className="input" value={profileGolongan} onChange={(e) => setProfileGolongan(e.target.value)} placeholder="Contoh: III/a" />
            </label>
            <label style={{ width: 320 }}>
              Jabatan
              <input className="input" value={profileJabatan} onChange={(e) => setProfileJabatan(e.target.value)} placeholder="Jabatan" />
            </label>
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
      </div>
    </AppShell>
  );
}
