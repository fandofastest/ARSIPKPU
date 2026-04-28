'use client';

import { useState, useRef } from 'react';

type SaveResp = { success: true } | { error: string; details?: unknown };

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<'kritik' | 'saran' | 'bug' | 'fitur' | 'lainnya'>('saran');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submitFeedback() {
    setSaving(true);
    setToast(null);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('subject', subject.trim());
      formData.append('message', message.trim());
      formData.append('rating', String(rating));
      files.forEach((file) => {
        formData.append('file', file);
      });

      const r = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const j = (await r.json().catch(() => ({}))) as SaveResp;
      if (!r.ok || !('success' in j && j.success)) {
        setToast({ kind: 'error', text: 'Gagal kirim laporan/saran.' });
        return;
      }
      setSubject('');
      setMessage('');
      setRating(5);
      setCategory('saran');
      setFiles([]);
      setToast({ kind: 'success', text: 'Terima kasih atas masukannya!' });
      setTimeout(() => {
        setIsOpen(false);
        setToast(null);
      }, 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btnPrimary"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          borderRadius: '9999px',
          width: '56px',
          height: '56px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        onClick={() => setIsOpen(true)}
        aria-label="Kirim Laporan atau Saran"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3V6Z" fill="currentColor" opacity="0.9"/>
          <path d="M8 9h8v2H8V9Z" fill="white" />
          <path d="M8 13h5v2H8v-2Z" fill="white" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          width: '320px',
          maxHeight: '80vh',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-hover)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Kirim Masukan</h3>
            <button type="button" onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Kategori
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="saran">💡 Saran Pengembangan</option>
                <option value="bug">🐞 Lapor Bug/Error</option>
                <option value="fitur">⭐ Request Fitur</option>
                <option value="kritik">📢 Kritik</option>
                <option value="lainnya">📝 Lainnya</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Rating Pengalaman (1-5)
              <input type="range" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{rating} Bintang</div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Judul Laporan
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Misal: Gagal upload PDF" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Deskripsi Detail
              <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={category === 'bug' ? "Jelaskan langkah terjadinya error..." : "Tuliskan saran Anda di sini..."} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Lampiran Foto (Opsional)
              <input type="file" multiple accept="image/*" onChange={handleFileChange} ref={fileRef} style={{ fontSize: '12px' }} />
              {files.length > 0 && <div style={{ fontSize: '11px', color: 'var(--success)' }}>{files.length} file dipilih</div>}
            </label>
            <button className="btn btnPrimary" type="button" onClick={submitFeedback} disabled={saving || subject.trim().length < 3 || message.trim().length < 5}>
              {saving ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
            {toast && (
              <div style={{ fontSize: '14px', textAlign: 'center', color: toast.kind === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                {toast.text}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
