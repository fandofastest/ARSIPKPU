'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  CATEGORY_TREE,
  ACCESS_LEVEL,
  ARCHIVE_TYPE,
  DOC_KIND_OPTIONS,
  KPU_UNITS
} from '@/lib/archiveConstants';
import {
  UploadCloud,
  FileCheck,
  FolderTree,
  FileText,
  Tag,
  Building2,
  Bookmark,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  FileBadge2
} from 'lucide-react';

type PreviewData = {
  file: File;
  category: string;
  subcategory: string;
  docKind: string;
  unit: string;
  title: string;
  subject: string;
  description: string;
  year: string;
  retention: string;
  accessLevel: string;
  archiveType: string;
  docNumber: string;
  docDate: string;
  unitSender: string;
  unitRecipient: string;
  tags: string;
};

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Step management
  const [step, setStep] = useState<'form' | 'preview'>('form');

  // Form fields (Standar Arsip KPU & JRA)
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [docKind, setDocKind] = useState<string>('Surat Keputusan');
  const [unit, setUnit] = useState<string>('Subbagian Hukum dan SDM');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showAdvancedDocDetails, setShowAdvancedDocDetails] = useState(false);
  const [retention, setRetention] = useState('5');
  const [accessLevel, setAccessLevel] = useState<string>('BIASA');
  const [archiveType, setArchiveType] = useState<string>('DINAMIS');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState('');
  const [unitSender, setUnitSender] = useState('');
  const [unitRecipient, setUnitRecipient] = useState('');
  const [tags, setTags] = useState('');

  // Upload state
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    if (!docKind) return 'Jenis Naskah / Dokumen wajib dipilih';
    if (!unit) return 'Unit Pencipta / Pengolah Arsip wajib dipilih';
    if (!title.trim()) return 'Judul wajib diisi';
    if (!year || isNaN(Number(year))) return 'Tahun wajib diisi dengan angka';
    if (!retention || isNaN(Number(retention))) return 'Retensi wajib diisi';
    if (isPemilu && Number(retention) < 10) return 'Kategori Pemilu: retensi minimal 10 tahun';
    return null;
  }

  function goPreview() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep('preview');
  }

  function buildPreviewData(): PreviewData {
    return {
      file: file!,
      category,
      subcategory,
      docKind,
      unit,
      title,
      subject,
      description,
      year,
      retention,
      accessLevel,
      archiveType,
      docNumber,
      docDate,
      unitSender,
      unitRecipient,
      tags
    };
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    // append teks sebelum file (penting untuk busboy stream parsing)
    form.append('category', category);
    form.append('subcategory', subcategory);
    form.append('docKind', docKind);
    form.append('type', docKind);
    form.append('unit', unit);
    form.append('title', title);
    if (subject) form.append('subject', subject);
    if (description) form.append('description', description);
    if (unitSender) form.append('unitSender', unitSender);
    if (unitRecipient) form.append('unitRecipient', unitRecipient);
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
            setSubject('');
            setDescription('');
            setDocNumber('');
            setDocDate('');
            setUnitSender('');
            setUnitRecipient('');
            setTags('');
            setCategory('');
            setSubcategory('');
            setStep('form');
            setProgress(0);
          } else {
            const errMsg = json?.error || 'Upload gagal';
            setError(errMsg);
            setStep('form');
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

  const preview = step === 'preview' ? buildPreviewData() : null;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Page Title & Wizard Tracker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <UploadCloud className="w-6 h-6 text-red-600" />
              Unggah Dokumen Arsip KPU
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formulir terstandar sesuai Pedoman Tata Naskah Dinas & JRA KPU Kota Dumai
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                step === 'form'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>1. Form Naskah & Metadata</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">→</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                step === 'preview'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>2. Konfirmasi & Upload</span>
            </span>
          </div>
        </div>

        {uploadSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Arsip dokumen berhasil diunggah, distandarisasi nama filenya, dan disimpan ke database KPU.</span>
            </div>
            <button
              onClick={() => setUploadSuccess(false)}
              className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <div className="space-y-6">
            {/* Drag & Drop File Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                onPickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group ${
                isDragOver
                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 scale-[1.01]'
                  : file
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131c2e] hover:border-red-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                {file ? <FileCheck className="w-7 h-7 text-emerald-600" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              {file ? (
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{file.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Ukuran: {(file.size / 1024 / 1024).toFixed(2)} MB · Klik untuk mengganti file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Tarik & Letakkan file fisik/digital di sini, atau klik untuk memilih
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Format: PDF, Word (DOCX), Excel, Gambar Scan (Maks 100MB)
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Classification & Naskah Jenis Section */}
            <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                  <FolderTree className="w-4.5 h-4.5 text-red-600" />
                  <span>Klasifikasi & Jenis Naskah Dinas</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">JRA Standar KPU</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="upload-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kategori Utama <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="upload-category"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {CATEGORY_TREE.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Kode pokok masalah klasifikasi arsip KPU (misal: Keuangan, Hukum, Teknis).</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="upload-subcategory" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subkategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="upload-subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    disabled={!category}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50"
                  >
                    <option value="">-- Pilih Subkategori --</option>
                    {subcategories.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Rincian sub-klasifikasi khusus naskah dinas (misal: SPJ, Keputusan, Berita Acara).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="upload-doc-kind" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jenis Naskah Dinas (<code className="text-red-600">docKind</code>) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="upload-doc-kind"
                    value={docKind}
                    onChange={(e) => setDocKind(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                  >
                    {DOC_KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Bentuk format naskah dinas resmi sesuai Tata Naskah Dinas KPU.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="upload-unit" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Unit Pencipta / Pengolah (<code className="text-red-600">unit</code>) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="upload-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                  >
                    {KPU_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Subbagian / Unit Kerja KPU Kota Dumai pembuat atau pengelola naskah ini.</p>
                </div>
              </div>

              {isPemilu && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Kategori Pemilu: Retensi minimal otomatis diatur ke 10 tahun sesuai Peraturan ANRI/KPU.</span>
                </div>
              )}
            </div>

            {/* Document Details & Subject Section */}
            <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileBadge2 className="w-4.5 h-4.5 text-red-600" />
                <span>Detail Informasi Dokumen</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Judul Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  id="upload-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Keputusan KPU Kota Dumai tentang Penetapan Hasil Rekapitulasi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Nama atau ringkasan resmi judul naskah dinas (dapat terisi otomatis dari OCR).</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-subject" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Perihal / Subjek Dokumen (<code className="text-slate-500">subject</code>)
                </label>
                <input
                  id="upload-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ringkasan perihal atau isi singkat pokok naskah dinas"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Garis besar perihal atau isi singkat pokok naskah dinas.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi / Keterangan Ringkas
                </label>
                <textarea
                  id="upload-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan, konteks rapat, atau deskripsi latar belakang dokumen"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="upload-year" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tahun Arsip <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="upload-year"
                    type="number"
                    min="1900"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tahun penerbitan berkas.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="upload-retention" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Retensi JRA (Tahun) {archiveType === 'DINAMIS' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="upload-retention"
                    type={archiveType === 'STATIS' ? 'text' : 'number'}
                    disabled={archiveType === 'STATIS'}
                    min={minRetention}
                    value={archiveType === 'STATIS' ? 'Permanen (Sepanjang Masa)' : retention}
                    onChange={(e) => handleRetentionChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none ${
                      archiveType === 'STATIS' ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 font-semibold text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {archiveType === 'STATIS' ? 'Arsip statis diset permanen selamanya.' : 'Durasi simpan dinamis sebelum penilaian/pemusnahan.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="upload-archive-type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tipe Arsip
                  </label>
                  <select
                    id="upload-archive-type"
                    value={archiveType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setArchiveType(val);
                      if (val === 'STATIS') {
                        setRetention('0');
                      } else {
                        setRetention('5');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {ARCHIVE_TYPE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dinamis (berlaku) / Statis (permanen).</p>
                </div>
              </div>

              {/* Access Level Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Level Akses Dokumen <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {ACCESS_LEVEL.map((lvl) => {
                    const isSelected = accessLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        id={`upload-access-${lvl.toLowerCase()}`}
                        onClick={() => setAccessLevel(lvl)}
                        className={`p-3 rounded-xl border-2 text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
                          isSelected
                            ? lvl === 'BIASA'
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : lvl === 'TERBATAS'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                              : 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span>{lvl === 'BIASA' ? '🟢' : lvl === 'TERBATAS' ? '🟡' : '🔴'}</span>
                        <span>{lvl}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  🟢 BIASA (Akses publik internal) · 🟡 TERBATAS (Akses unit kerja) · 🔴 RAHASIA (Khusus Admin/Pimpinan).
                </p>
                {accessLevel === 'RAHASIA' && (
                  <p className="text-[11px] text-red-500 font-medium flex items-center gap-1.5 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Dokumen Rahasia hanya dapat diakses & diunduh oleh Administrator.
                  </p>
                )}
              </div>
            </div>

            {/* Optional Metadata Section with Checkbox Toggle */}
            <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAdvancedDocDetails}
                  onChange={(e) => setShowAdvancedDocDetails(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                  <Building2 className="w-4.5 h-4.5 text-red-600" />
                  <span>Tambahkan Nomor Surat, Tanggal & Instansi Pengirim/Penerima (Opsional)</span>
                </div>
              </label>

              {showAdvancedDocDetails && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nomor Naskah Dinas</label>
                      <input
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder="Contoh: 123/KPU/KOTA-DUMAI/2026"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal Naskah Dinas</label>
                      <input
                        type="date"
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="upload-unit-sender" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Instansi / Pengirim (<code className="text-slate-500">unitSender</code>)
                      </label>
                      <input
                        id="upload-unit-sender"
                        value={unitSender}
                        onChange={(e) => setUnitSender(e.target.value)}
                        placeholder="Contoh: KPU Provinsi Riau / Bawaslu Kota Dumai"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="upload-unit-recipient" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Instansi / Penerima (<code className="text-slate-500">unitRecipient</code>)
                      </label>
                      <input
                        id="upload-unit-recipient"
                        value={unitRecipient}
                        onChange={(e) => setUnitRecipient(e.target.value)}
                        placeholder="Contoh: Ketua KPU Kota Dumai"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tagar / Tags (Pisahkan dengan koma)
                </label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Misal: pemilu, 2026, rekapitulasi, keputusan, sk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none mt-1"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="upload-preview-btn"
              type="button"
              onClick={goPreview}
              className="w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Lanjut Pratinjau Dokumen Standar KPU</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PREVIEW & CONFIRMATION */}
        {step === 'preview' && preview && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileCheck className="w-5 h-5 text-red-600" />
                <span>Pratinjau Metadata Naskah Dinas KPU</span>
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  ['File Utama', preview.file.name],
                  ['Ukuran File', `${(preview.file.size / 1024 / 1024).toFixed(2)} MB`],
                  ['Kategori Utama', preview.category],
                  ['Subkategori', preview.subcategory],
                  ['Jenis Naskah Dinas (docKind)', preview.docKind],
                  ['Unit Pengolah/Pencipta (unit)', preview.unit],
                  ['Judul Dokumen', preview.title],
                  ['Perihal / Subjek', preview.subject || '-'],
                  ['Tahun Arsip', preview.year],
                  ['Retensi JRA', `${preview.retention} tahun`],
                  ['Tipe Arsip', preview.archiveType],
                  ['Level Akses', preview.accessLevel],
                  ['Nomor Naskah Dinas', preview.docNumber || '-'],
                  ['Tanggal Naskah Dinas', preview.docDate || '-'],
                  ['Instansi Pengirim', preview.unitSender || '-'],
                  ['Instansi Penerima', preview.unitRecipient || '-'],
                  ['Tags', preview.tags || '-'],
                  ['Deskripsi', preview.description || '-']
                ].map(([label, value]) => (
                  <div key={label} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium sm:w-56 flex-shrink-0">{label}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-right sm:text-left flex-1 break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {loading && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Mengunggah & memproses penamaan standar KPU...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                id="upload-back-btn"
                type="button"
                onClick={() => setStep('form')}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali Edit</span>
              </button>
              <button
                id="upload-submit-btn"
                type="button"
                onClick={upload}
                disabled={loading}
                className="flex-2 py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Mengunggah...' : 'Konfirmasi & Upload Sekarang'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
