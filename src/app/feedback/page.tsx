'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type MeResp =
  | { success: true; data: { userId: string; role: string } }
  | { error: string };

type FeedbackItem = {
  _id: string;
  category: 'kritik' | 'saran' | 'bug' | 'fitur' | 'lainnya';
  subject: string;
  message: string;
  rating?: number | null;
  status: 'new' | 'reviewed' | 'resolved';
  submittedBy: { name: string; phone: string };
  createdAt: string;
};

type ListResp =
  | {
      success: true;
      data: FeedbackItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }
  | { error: string };

type SaveResp = { success: true } | { error: string; details?: unknown };

export default function FeedbackPage() {
  const [meRole, setMeRole] = useState<string>('');
  const [category, setCategory] = useState<'kritik' | 'saran' | 'bug' | 'fitur' | 'lainnya'>('saran');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(4);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function loadMe() {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const j = (await r.json()) as MeResp;
    if ('success' in j) setMeRole(j.data.role);
  }

  async function loadFeedback() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set('page', '1');
      sp.set('limit', '50');
      if (statusFilter) sp.set('status', statusFilter);
      const r = await fetch(`/api/feedback?${sp.toString()}`, { credentials: 'include' });
      const j = (await r.json()) as ListResp;
      if (r.ok && 'success' in j) setItems(j.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    if (meRole !== 'admin') return;
    void loadFeedback();
  }, [meRole, statusFilter]);

  async function submitFeedback() {
    setSaving(true);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          rating
        })
      });
      const j = (await r.json().catch(() => ({}))) as SaveResp;
      if (!r.ok || !('success' in j && j.success)) {
        setToast({ kind: 'error', text: 'Gagal kirim kritik/saran.' });
        return;
      }
      setSubject('');
      setMessage('');
      setRating(4);
      setCategory('saran');
      setToast({ kind: 'success', text: 'Terima kasih, masukan berhasil dikirim.' });
      void loadFeedback();
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: 'new' | 'reviewed' | 'resolved') {
    const r = await fetch('/api/feedback', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (!r.ok) {
      setToast({ kind: 'error', text: 'Gagal update status.' });
      return;
    }
    setToast({ kind: 'success', text: 'Status berhasil diperbarui.' });
    void loadFeedback();
  }

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Kritik & Saran</h1>
        <div className="card">
          <div className="row">
            <label style={{ flex: 1, minWidth: 220 }}>
              Kategori
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="saran">Saran</option>
                <option value="kritik">Kritik</option>
                <option value="bug">Laporan Bug</option>
                <option value="fitur">Usulan Fitur</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </label>
            <label style={{ width: 160 }}>
              Rating
              <select className="input" value={String(rating)} onChange={(e) => setRating(Number(e.target.value))}>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>
          </div>
          <div style={{ height: 10 }} />
          <label>
            Judul
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ringkasan masukan Anda" />
          </label>
          <div style={{ height: 10 }} />
          <label>
            Pesan
            <textarea className="input" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tuliskan detail kritik/saran..." />
          </label>
          <div style={{ height: 12 }} />
          <button className="btn" type="button" onClick={submitFeedback} disabled={saving || subject.trim().length < 3 || message.trim().length < 5}>
            {saving ? 'Mengirim...' : 'Kirim Masukan'}
          </button>
          {toast ? (
            <div style={{ marginTop: 10, color: toast.kind === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {toast.text}
            </div>
          ) : null}
        </div>

        {meRole === 'admin' ? (
          <>
            <div style={{ height: 16 }} />

            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Daftar Masukan</h2>
                <label>
                  Status
                  <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">Semua</option>
                    <option value="new">Baru</option>
                    <option value="reviewed">Ditinjau</option>
                    <option value="resolved">Selesai</option>
                  </select>
                </label>
              </div>
              <div style={{ height: 10 }} />
              {loading ? (
                <div style={{ color: 'var(--muted)' }}>Memuat...</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Kategori</th>
                      <th>Judul</th>
                      <th>Pengirim</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it._id}>
                        <td>{new Date(it.createdAt).toLocaleString()}</td>
                        <td>{it.category}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{it.subject}</div>
                          <div style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{it.message}</div>
                        </td>
                        <td>{it.submittedBy?.name}</td>
                        <td>{it.status}</td>
                        <td>
                          <div className="row">
                            <button className="btn btnSecondary" type="button" onClick={() => void updateStatus(it._id, 'reviewed')}>
                              Tinjau
                            </button>
                            <button className="btn btnSecondary" type="button" onClick={() => void updateStatus(it._id, 'resolved')}>
                              Selesai
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!items.length ? (
                      <tr>
                        <td colSpan={6} style={{ color: 'var(--muted)' }}>
                          Belum ada masukan.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div style={{ height: 12, color: 'var(--muted)' }}>
            Masukan Anda akan dilihat oleh admin. Daftar masukan hanya dapat diakses admin.
          </div>
        )}
      </div>
    </AppShell>
  );
}
