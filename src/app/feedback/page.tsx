'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type MeResp =
  | { success: true; data: { userId: string; role: string } }
  | { error: string };

type FeedbackItem = {
  _id: string;
  category: 'kritik' | 'saran' | 'bug' | 'fitur' | 'lainnya' | 'kuisioner';
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function parseKuisionerAnswers(message: string) {
    const lines = String(message ?? '').split(/\r?\n/);
    const answers: string[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*Jawaban:\s*(.+)\s*$/i);
      if (m?.[1]) answers.push(m[1].trim());
    }
    return {
      q1: answers[0] || '',
      q2: answers[1] || '',
      q3: answers[2] || '',
      q4: answers[3] || '',
      q5: answers[4] || ''
    };
  }

  function buildCounts(values: string[]) {
    const map = new Map<string, number>();
    for (const v of values) {
      const key = String(v ?? '').trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }

  const visibleCategoryLabel =
    categoryFilter === 'kuisioner'
      ? 'Kuisioner'
      : categoryFilter === 'bug'
        ? 'Bug'
        : categoryFilter === 'fitur'
          ? 'Fitur'
          : categoryFilter === 'kritik'
            ? 'Kritik'
            : categoryFilter === 'saran'
              ? 'Saran'
              : categoryFilter === 'lainnya'
                ? 'Lainnya'
                : 'Semua';

  const reportItems = items;
  const totalCount = reportItems.length;
  const rated = reportItems.map((x) => (typeof x.rating === 'number' ? x.rating : null)).filter((x): x is number => x !== null);
  const avgRating = rated.length ? rated.reduce((s, n) => s + n, 0) / rated.length : 0;
  const statusCounts = buildCounts(reportItems.map((x) => x.status));
  const categoryCounts = buildCounts(reportItems.map((x) => x.category));

  const kuisionerItems = reportItems.filter((x) => x.category === 'kuisioner');
  const kuisionerAnswers = kuisionerItems.map((x) => parseKuisionerAnswers(x.message));
  const q1Counts = buildCounts(kuisionerAnswers.map((a) => a.q1));
  const q2Counts = buildCounts(kuisionerAnswers.map((a) => a.q2));
  const q3Counts = buildCounts(kuisionerAnswers.map((a) => a.q3));
  const q4Counts = buildCounts(kuisionerAnswers.map((a) => a.q4));
  const q5Counts = buildCounts(kuisionerAnswers.map((a) => a.q5));

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
      sp.set('limit', '200');
      if (statusFilter) sp.set('status', statusFilter);
      if (categoryFilter) sp.set('category', categoryFilter);
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
  }, [meRole, statusFilter, categoryFilter]);

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

  function printReport() {
    setSelectedItem(null);
    setToast(null);
    window.print();
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
        <div className="noPrint" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: 6 }}>Manajemen Laporan Pengguna</h1>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              Tinjau, filter per kategori, dan cetak laporan PDF dari feedback pengguna.
            </p>
          </div>
          <button className="btn btnPrimary" type="button" onClick={printReport}>
            Cetak / Simpan PDF
          </button>
        </div>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
          Tinjau dan tindak lanjuti kritik, saran, serta laporan bug dari pengguna sistem.
        </p>

        <div className="card reportOnly" id="printable-feedback-report" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/logo.png" alt="Logo KPU" style={{ width: 54, height: 'auto' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>LAPORAN FEEDBACK PENGGUNA</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>KPU Smart Archive</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
              Dicetak: {new Date().toLocaleString()}
            </div>
          </div>

          <div style={{ height: 14 }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>KATEGORI</div>
              <div style={{ fontWeight: 700 }}>{visibleCategoryLabel}</div>
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>TOTAL DATA</div>
              <div style={{ fontWeight: 700 }}>{totalCount}</div>
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>RATA-RATA RATING</div>
              <div style={{ fontWeight: 700 }}>{avgRating ? avgRating.toFixed(2) : '-'}</div>
            </div>
          </div>

          <div style={{ height: 14 }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>RINGKASAN STATUS</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {statusCounts.map(([k, v]) => (
                  <span key={k} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>
            </div>
            {!categoryFilter && (
              <div style={{ flex: '1 1 280px' }}>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>RINGKASAN KATEGORI</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {categoryCounts.map(([k, v]) => (
                    <span key={k} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>
                      {k}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(categoryFilter === 'kuisioner' || (!categoryFilter && kuisionerItems.length > 0)) && (
            <>
              <div style={{ height: 18 }} />
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Ringkasan Kuisioner (Pemahaman Penggunaan)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Q1 Pemahaman alur upload + metadata</div>
                  {q1Counts.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                      <div style={{ color: 'var(--muted)' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Q2 Kemudahan pencarian arsip</div>
                  {q2Counts.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                      <div style={{ color: 'var(--muted)' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Q3 Bagian yang membingungkan</div>
                  {q3Counts.slice(0, 6).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                      <div style={{ color: 'var(--muted)' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Q4 Fitur paling membantu</div>
                  {q4Counts.slice(0, 6).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                      <div style={{ color: 'var(--muted)' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Q5 Saran perbaikan prioritas</div>
                  {q5Counts.slice(0, 6).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                      <div style={{ color: 'var(--muted)' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ height: 18 }} />
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Daftar Feedback</div>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Tanggal</th>
                  <th style={{ width: 110 }}>Kategori</th>
                  <th style={{ width: 80 }}>Rating</th>
                  <th style={{ width: 180 }}>Pengirim</th>
                  <th>Subjek</th>
                  <th>Isi</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((it) => (
                  <tr key={`report-${it._id}`}>
                    <td style={{ fontSize: 12 }}>{new Date(it.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12, fontWeight: 700 }}>{it.category}</td>
                    <td style={{ fontSize: 12 }}>{typeof it.rating === 'number' ? `★ ${it.rating}` : '-'}</td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{it.submittedBy?.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>{it.submittedBy?.role}</div>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 700 }}>{it.subject}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{it.message}</td>
                  </tr>
                ))}
                {!reportItems.length ? (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px' }}>
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Daftar Tiket</h2>
            <div className="noPrint" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>Kategori:</span>
                <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 160 }}>
                  <option value="">Semua</option>
                  <option value="kuisioner">Kuisioner</option>
                  <option value="saran">Saran</option>
                  <option value="kritik">Kritik</option>
                  <option value="bug">Bug</option>
                  <option value="fitur">Fitur</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>Status:</span>
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                  <option value="">Semua</option>
                  <option value="new">🆕 Baru</option>
                  <option value="reviewed">👀 Ditinjau</option>
                  <option value="resolved">✅ Selesai</option>
                </select>
              </label>
            </div>
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
                        background: it.category === 'bug' ? 'var(--danger-light)' : it.category === 'kuisioner' ? 'color-mix(in srgb, var(--info) 14%, var(--panel))' : 'var(--primary-light)',
                        color: it.category === 'bug' ? 'var(--danger)' : it.category === 'kuisioner' ? 'var(--info)' : 'var(--primary)',
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
          <div className="noPrint" style={{ 
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

      <style jsx global>{`
        @media print {
          .sidebar,
          .topbar,
          .feedback-widget,
          .noPrint {
            display: none !important;
          }
          .appShell {
            background: #fff !important;
            display: block !important;
          }
          .pageWrap {
            background: #fff !important;
          }
          .container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          #printable-feedback-report {
            border: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </AppShell>
  );
}
