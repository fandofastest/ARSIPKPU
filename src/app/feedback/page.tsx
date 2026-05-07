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
  attachments?: string[];
  submittedBy: { name: string; phone: string; role: string };
  createdAt: string;
};

type ListResp =
  | {
      success: true;
      data: FeedbackItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }
  | { error: string };

export default function FeedbackPage() {
  const [meRole, setMeRole] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
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
    if (selectedItem?._id === id) {
      setSelectedItem({ ...selectedItem, status });
    }
    void loadFeedback();
  }

  if (meRole && meRole !== 'admin') {
    return (
      <AppShell>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <h1 style={{ color: 'var(--danger)' }}>Akses Dibatalkan</h1>
            <p style={{ color: 'var(--muted)' }}>Halaman manajemen laporan hanya untuk Administrator.</p>
            <div style={{ marginTop: 20 }}>
              Silakan gunakan tombol masukan di pojok kanan bawah untuk mengirim laporan.
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Manajemen Laporan Pengguna</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
          Tinjau dan tindak lanjuti kritik, saran, serta laporan bug dari pengguna sistem.
        </p>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Daftar Tiket</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>Filter Status:</span>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                <option value="">Semua</option>
                <option value="new">🆕 Baru</option>
                <option value="reviewed">👀 Ditinjau</option>
                <option value="resolved">✅ Selesai</option>
              </select>
            </label>
          </div>
          <div style={{ height: 16 }} />
          {loading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>Memuat daftar laporan...</div>
          ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Judul</th>
                  <th>Pengirim</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id}>
                    <td style={{ fontSize: 13 }}>{new Date(it.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span style={{ 
                        fontSize: 11, 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        background: it.category === 'bug' ? 'var(--danger-light)' : 'var(--primary-light)',
                        color: it.category === 'bug' ? 'var(--danger)' : 'var(--primary)',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {it.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.subject}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {it.submittedBy?.name}
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>{it.submittedBy?.role}</div>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: 12, 
                        color: it.status === 'resolved' ? 'var(--success)' : it.status === 'reviewed' ? 'var(--warning)' : 'var(--danger)' 
                      }}>
                        ● {it.status === 'resolved' ? 'Selesai' : it.status === 'reviewed' ? 'Ditinjau' : 'Baru'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btnSecondary" type="button" onClick={() => setSelectedItem(it)} style={{ padding: '4px 12px', fontSize: 13 }}>
                        Buka Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && !loading ? (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>
                      Belum ada laporan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Modal Detail */}
        {selectedItem && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20
          }} onClick={() => setSelectedItem(null)}>
            <div style={{
              backgroundColor: 'var(--panel)',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow)'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Detail Laporan #{selectedItem._id.slice(-6)}</h2>
                <button type="button" onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Tutup (X)</button>
              </div>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: '2 1 400px' }}>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>SUBJEK</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{selectedItem.subject}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>PESAN / DESKRIPSI</div>
                    <div style={{ whiteSpace: 'pre-wrap', padding: '12px', background: 'var(--bg2)', borderRadius: 8, minHeight: 100, border: '1px solid var(--border)' }}>
                      {selectedItem.message}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 200px', borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>PENGIRIM</div>
                      <div style={{ fontWeight: 600 }}>{selectedItem.submittedBy?.name}</div>
                      <div style={{ fontSize: 12 }}>{selectedItem.submittedBy?.phone}</div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>STATUS</div>
                      <div style={{ fontWeight: 700, color: selectedItem.status === 'resolved' ? 'var(--success)' : selectedItem.status === 'reviewed' ? 'var(--warning)' : 'var(--danger)' }}>
                        {selectedItem.status.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>RATING</div>
                      <div style={{ fontWeight: 700, color: '#f59e0b' }}>★ {selectedItem.rating || '-'}</div>
                    </div>
                  </div>
                </div>

                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>LAMPIRAN FOTO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                      {selectedItem.attachments.map((path, idx) => (
                        <a key={idx} href={`/api/view?path=${encodeURIComponent(path)}`} target="_blank" rel="noreferrer">
                          <img 
                            src={`/api/view?path=${encodeURIComponent(path)}`} 
                            alt={`Attachment ${idx + 1}`}
                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end', backgroundColor: 'var(--bg2)' }}>
                {selectedItem.status === 'new' && (
                  <button className="btn btnSecondary" onClick={() => void updateStatus(selectedItem._id, 'reviewed')}>
                    Tandai Sedang Ditinjau
                  </button>
                )}
                {selectedItem.status !== 'resolved' && (
                  <button className="btn btnPrimary" onClick={() => void updateStatus(selectedItem._id, 'resolved')}>
                    Tandai Selesai / Teratasi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div style={{ 
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', 
            padding: '12px 24px', borderRadius: 8, background: 'var(--surface)', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 11000,
            color: toast.kind === 'success' ? 'var(--success)' : 'var(--danger)',
            fontWeight: 600
          }}>
            {toast.text}
          </div>
        )}
      </div>
    </AppShell>
  );
}
