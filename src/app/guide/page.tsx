'use client';

import { AppShell } from '@/components/AppShell';

export default function GuidePage() {
  return (
    <AppShell>
      <div className="container" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0 }}>Panduan Pengguna</h1>
          <button 
            className="btn btnPrimary" 
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>

        <div className="card" id="printable-guide" style={{ padding: '40px', lineHeight: '1.6' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '20px', marginBottom: '30px' }}>
            <img src="/logo.png" alt="Logo KPU" style={{ width: '80px', marginBottom: '16px' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>PANDUAN PENGGUNAAN KPU SMART ARCHIVE</h1>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Sistem arsip pintar dengan pencarian cepat dan klasifikasi otomatis.</h2>
          </div>

          <section style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>1. Pendahuluan</h3>
            <p>
              KPU Smart Archive dirancang untuk mendigitalisasi, mengorganisir, dan mengamankan seluruh dokumen dengan standar klasifikasi yang ketat. Sistem ini mendukung pengelolaan arsip dinamis dan statis dengan kebijakan retensi otomatis.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>2. Alur Unggah Arsip</h3>
            <p>Proses unggah dokumen dilakukan melalui langkah-langkah berikut:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Klasifikasi:</strong> Pilih kategori utama dan subkategori yang sesuai.</li>
              <li><strong>Metadata:</strong> Isi detail dokumen seperti judul, tahun, dan tingkat keamanan.</li>
              <li><strong>Keamanan:</strong> Gunakan level <strong>RAHASIA</strong> untuk dokumen yang hanya boleh diakses oleh admin dan pemilik dokumen.</li>
              <li><strong>Retensi:</strong> Untuk arsip Pemilu, sistem akan menetapkan masa simpan minimal 10 tahun secara otomatis.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>3. Manajemen Feedback & Laporan Bug</h3>
            <p>Pengguna dapat memberikan masukan melalui tombol melayang di pojok kanan bawah:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Rating:</strong> Memberikan penilaian terhadap pengalaman penggunaan sistem.</li>
              <li><strong>Lampiran:</strong> Unggah screenshot jika menemukan error atau bug pada sistem.</li>
              <li><strong>Tindak Lanjut:</strong> Admin akan meninjau setiap laporan dan memperbarui statusnya hingga selesai.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>4. Fitur Keamanan</h3>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Audit Log:</strong> Setiap aktivitas akses dokumen dicatat untuk keperluan forensik data.</li>
              <li><strong>Enkripsi:</strong> Dokumen disimpan dengan sistem penamaan yang unik untuk mencegah akses langsung yang tidak sah.</li>
            </ul>
          </section>

          <div
            style={{
              marginTop: '50px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
              fontSize: '12px',
              textAlign: 'center',
              color: 'var(--muted)'
            }}
          >
            © 2026 KPU Smart Archive - Dokumen ini dihasilkan secara otomatis oleh KPU Smart Archive
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .sidebar, .topbar, .btn, .feedback-widget {
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
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          #printable-guide {
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
