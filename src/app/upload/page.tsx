'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CATEGORY_TREE, ACCESS_LEVEL, ARCHIVE_TYPE } from '@/lib/archiveConstants';

type PreviewData = {
  file: File;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  year: string;
  retention: string;
  accessLevel: string;
  archiveType: string;
  docNumber: string;
  docDate: string;
  tags: string;
};

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Step management
  const [step, setStep] = useState<'form' | 'preview'>('form');

  // Form fields
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [retention, setRetention] = useState('5');
  const [accessLevel, setAccessLevel] = useState<string>('BIASA');
  const [archiveType, setArchiveType] = useState<string>('DINAMIS');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState('');
  const [tags, setTags] = useState('');

  // Upload state
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get subcategories for selected category
  const selectedCatDef = CATEGORY_TREE.find((c) => c.name === category);
  const subcategories = selectedCatDef?.subcategories ?? [];

  // Rule 4: Pemilu min retention = 10
  const isPemilu = category === 'Pemilu';
  const minRetention = isPemilu ? 10 : 1;

  function handleCategoryChange(val: string) {
    setCategory(val);
    setSubcategory('');
    if (val === 'Pemilu') {
      const cur = Number(retention);
      if (isNaN(cur) || cur < 10) setRetention('10');
    }
  }

  function handleRetentionChange(val: string) {
    if (isPemilu) {
      const n = Number(val);
      setRetention(isNaN(n) || n < 10 ? '10' : val);
    } else {
      setRetention(val);
    }
  }

  function onPickFile(f: File | null) {
    setFile(f);
    setError(null);
    setUploadSuccess(false);
    setProgress(0);
  }

  function validate(): string | null {
    if (!file) return 'Pilih file terlebih dahulu';
    if (!category) return 'Kategori wajib dipilih';
    if (!subcategory) return 'Subkategori wajib dipilih';
    if (!title.trim()) return 'Judul wajib diisi';
    if (!year || isNaN(Number(year))) return 'Tahun wajib diisi dengan angka';
    if (!retention || isNaN(Number(retention))) return 'Retensi wajib diisi';
    if (isPemilu && Number(retention) < 10) return 'Kategori Pemilu: retensi minimal 10 tahun';
    return null;
  }

  function goPreview() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep('preview');
  }

  function buildPreviewData(): PreviewData {
    return { file: file!, category, subcategory, title, description, year, retention, accessLevel, archiveType, docNumber, docDate, tags };
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    // PENTING: semua field text harus di-append SEBELUM file,
    // karena busboy memproses multipart secara urutan dan file stream
    // yang besar bisa membuat field yang datang setelahnya tidak terbaca.
    form.append('category', category);
    form.append('subcategory', subcategory);
    form.append('title', title);
    form.append('description', description);
    form.append('year', year);
    form.append('retention', retention);
    form.append('accessLevel', accessLevel);
    form.append('archiveType', archiveType);
    if (docNumber) form.append('docNumber', docNumber);
    if (docDate) form.append('docDate', docDate);
    if (tags) form.append('tags', tags);
    // File di-append terakhir
    form.append('file', file);

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      };

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadSuccess(true);
            setFile(null);
            setTitle('');
            setDescription('');
            setDocNumber('');
            setDocDate('');
            setTags('');
            setCategory('');
            setSubcategory('');
            setStep('form');
            setProgress(0);
          } else {
            const errMsg = json?.error || 'Upload gagal';
            setError(errMsg);
            setStep('form');
            // Scroll ke atas agar error terlihat
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
          }
        } catch {
          setError('Upload gagal');
          setStep('form');
        } finally {
          setLoading(false);
          resolve();
        }
      };

      xhr.onerror = () => {
        setError('Terjadi kesalahan jaringan');
        setLoading(false);
        setStep('form');
        resolve();
      };

      xhr.send(form);
    });
  }

  const accessLevelColor: Record<string, string> = {
    BIASA: 'var(--success)',
    TERBATAS: '#f59e0b',
    RAHASIA: 'var(--danger)'
  };

  const preview = step === 'preview' ? buildPreviewData() : null;

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 760, paddingBottom: 100 }}>
        <h1 style={{ marginTop: 0 }}>Upload Arsip</h1>


        {uploadSuccess && (
          <div style={{ padding: '12px 16px', background: 'color-mix(in srgb, var(--success) 15%, transparent)', border: '1px solid var(--success)', borderRadius: 8, marginBottom: 20, color: 'var(--success)', fontWeight: 600 }}>
            ✅ Arsip berhasil diunggah dan disimpan.
          </div>
        )}

        {/* === STEP: FORM === */}
        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* File Picker */}
            <div
              className="card"
              style={{ borderStyle: 'dashed', cursor: 'pointer', textAlign: 'center' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onPickFile(e.dataTransfer.files?.[0] ?? null); }}
              onClick={() => fileRef.current?.click()}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block', color: 'var(--muted)' }}>
                <path d="M12 3l4 4h-3v7h-2V7H8l4-4Z" fill="currentColor" />
                <path d="M5 14a2 2 0 0 1 2-2h1v2H7v5h10v-5h-1v-2h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z" fill="currentColor" opacity="0.6" />
              </svg>
              <div style={{ fontWeight: 700 }}>{file ? file.name : 'Drag & drop file, atau klik untuk pilih'}</div>
              {file && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{Math.round(file.size / 1024)} KB</div>}
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Category & Subcategory */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>📁 Klasifikasi Arsip</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Kategori <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <select id="upload-category" className="input" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                    <option value="">-- Pilih Kategori --</option>
                    {CATEGORY_TREE.map((c) => (
                      <option key={c.code} value={c.name}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Subkategori <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <select id="upload-subcategory" className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} disabled={!category}>
                    <option value="">-- Pilih Subkategori --</option>
                    {subcategories.map((s) => (
                      <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </label>
              </div>

              {isPemilu && (
                <div style={{ padding: '8px 12px', background: 'color-mix(in srgb, #4f46e5 10%, transparent)', borderRadius: 6, fontSize: 13, color: '#4f46e5', fontWeight: 500 }}>
                  ℹ️ Kategori Pemilu: Retensi minimal otomatis diatur ke <strong>10 tahun</strong>.
                </div>
              )}
            </div>

            {/* Main Fields */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>📝 Informasi Arsip</h3>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <span>Judul <span style={{ color: 'var(--danger)' }}>*</span></span>
                <input id="upload-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul dokumen arsip" />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <span>Deskripsi</span>
                <textarea id="upload-description" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat isi dokumen" />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Tahun Arsip <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <input id="upload-year" className="input" type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Retensi (tahun) <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <input
                    id="upload-retention"
                    className="input"
                    type="number"
                    min={minRetention}
                    value={retention}
                    onChange={(e) => handleRetentionChange(e.target.value)}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Tipe Arsip</span>
                  <select id="upload-archive-type" className="input" value={archiveType} onChange={(e) => setArchiveType(e.target.value)}>
                    {ARCHIVE_TYPE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <span>Level Akses <span style={{ color: 'var(--danger)' }}>*</span></span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ACCESS_LEVEL.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      id={`upload-access-${lvl.toLowerCase()}`}
                      onClick={() => setAccessLevel(lvl)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: `2px solid ${accessLevel === lvl ? accessLevelColor[lvl] : 'var(--border)'}`,
                        background: accessLevel === lvl ? `color-mix(in srgb, ${accessLevelColor[lvl]} 12%, transparent)` : 'transparent',
                        color: accessLevel === lvl ? accessLevelColor[lvl] : 'var(--muted)',
                        fontWeight: accessLevel === lvl ? 700 : 400,
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      {lvl === 'BIASA' ? '🟢' : lvl === 'TERBATAS' ? '🟡' : '🔴'} {lvl}
                    </button>
                  ))}
                </div>
                {accessLevel === 'RAHASIA' && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                    ⚠️ Dokumen RAHASIA hanya dapat diakses oleh Admin.
                  </div>
                )}
              </label>
            </div>

            {/* Optional Fields */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>📎 Metadata Opsional</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Nomor Dokumen</span>
                  <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Misal: 001/KPU/IV/2026" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  <span>Tanggal Dokumen</span>
                  <input className="input" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <span>Tags (pisahkan dengan koma)</span>
                <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Misal: pemilu, 2026, rekapitulasi" />
              </label>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <button id="upload-preview-btn" className="btn btnPrimary" type="button" onClick={goPreview} style={{ fontSize: 16, padding: '14px', marginTop: 32 }}>
              Pratinjau Sebelum Kirim →
            </button>
          </div>
        )}

        {/* === STEP: PREVIEW === */}
        {step === 'preview' && preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 5%, var(--surface))' }}>
              <h2 style={{ margin: '0 0 16px 0' }}>📋 Pratinjau Arsip</h2>

              <div className="tableWrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    {[
                      ['File', preview.file.name],
                      ['Kategori', `${preview.category}`],
                      ['Subkategori', `${preview.subcategory}`],
                      ['Judul', preview.title],
                      ['Tahun', preview.year],
                      ['Retensi', `${preview.retention} tahun`],
                      ['Tipe Arsip', preview.archiveType],
                      ['Level Akses', preview.accessLevel],
                      ['Nomor Dokumen', preview.docNumber || '-'],
                      ['Tanggal Dokumen', preview.docDate || '-'],
                      ['Tags', preview.tags || '-'],
                      ['Deskripsi', preview.description || '-'],
                    ].map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px 8px 0', color: 'var(--muted)', whiteSpace: 'nowrap', width: 160 }}>{label}</td>
                        <td style={{ padding: '8px 0', fontWeight: label === 'Level Akses' ? 700 : 400, color: label === 'Level Akses' ? accessLevelColor[value] : 'inherit' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Mengunggah... {progress}%</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button id="upload-back-btn" className="btn btnSecondary" type="button" onClick={() => setStep('form')} disabled={loading} style={{ flex: 1 }}>
                ← Kembali Edit
              </button>
              <button id="upload-submit-btn" className="btn btnPrimary" type="button" onClick={upload} disabled={loading} style={{ flex: 2, fontSize: 16 }}>
                {loading ? 'Mengunggah...' : '✅ Konfirmasi & Upload'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
