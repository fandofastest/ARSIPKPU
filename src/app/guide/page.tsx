/* eslint-disable @next/next/no-img-element */
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
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '20px', marginBottom: '40px' }}>
            <img src="/logo.png" alt="Logo KPU" style={{ width: '80px', marginBottom: '16px' }} />
            <h1 style={{ margin: 0, fontSize: '26px' }}>BUKU PANDUAN PENGGUNAAN APLIKASI (USER MANUAL)</h1>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)' }}>KPU SMART ARCHIVE</h2>
            <p style={{ marginTop: '10px', color: 'var(--muted)' }}>Dokumen Petunjuk Teknis Lengkap - Langkah demi Langkah</p>
          </div>

          <section id="kata-pengantar" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Kata Pengantar</h3>
            <p>Puji syukur ke hadirat Tuhan Yang Maha Esa atas berkat dan rahmat-Nya, penyusunan Buku Panduan Penggunaan Aplikasi (User Manual) KPU Smart Archive ini dapat diselesaikan dengan baik.</p>
            <p>Aplikasi KPU Smart Archive dikembangkan sebagai solusi digitalisasi tata kelola kearsipan, yang dirancang khusus untuk memenuhi standar keamanan, kecepatan penemuan kembali informasi, dan efisiensi ruang penyimpanan. Buku panduan ini disusun sebagai acuan praktis bagi seluruh pengguna, baik staf pengelola arsip maupun administrator, agar dapat mengoperasikan setiap fitur aplikasi secara optimal dan sesuai dengan prosedur yang berlaku.</p>
            <p>Kami menyadari bahwa sistem dan panduan ini akan terus berkembang. Oleh karena itu, masukan dan saran yang membangun sangat kami harapkan. Akhir kata, semoga buku panduan ini bermanfaat dan dapat mendukung peningkatan kinerja kearsipan di lingkungan KPU.</p>
            <br/>
            <p style={{ textAlign: 'right' }}><strong>Tim Pengembang KPU Smart Archive</strong></p>
          </section>

          <section id="daftar-isi" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Daftar Isi</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0, lineHeight: '2' }}>
              <li><a href="#kata-pengantar" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>Kata Pengantar</strong></a></li>
              <li><a href="#daftar-isi" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>Daftar Isi</strong></a></li>
              <li><a href="#bab-1" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>1. Akses Sistem (Login &amp; Logout)</strong></a></li>
              <li><a href="#bab-2" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>2. Mengenal Dashboard Utama</strong></a></li>
              <li><a href="#bab-3" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>3. Manajemen Arsip (Menu Utama)</strong></a></li>
              <li><a href="#bab-4" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>4. Pengaturan Sistem (Menu Khusus Administrator)</strong></a></li>
              <li><a href="#bab-5" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>5. Fitur Bantuan dan Pelaporan Bug (Feedback)</strong></a></li>
              <li><a href="#bab-6" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>6. Log Aktivitas (Audit Trail)</strong></a></li>
              <li><a href="#penutup" style={{ textDecoration: 'none', color: 'var(--primary)' }}><strong>Penutup</strong></a></li>
            </ul>
          </section>

          <section id="bab-1" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>1. Akses Sistem (Login & Logout)</h3>
            <p>Langkah-langkah untuk masuk dan keluar dari sistem secara aman:</p>
            <div style={{ paddingLeft: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>A. Cara Masuk (Login)</h4>
              <img src="/panduan/login.png" alt="Tampilan Login" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Buka browser web (disarankan menggunakan Google Chrome atau Mozilla Firefox).</li>
                <li>Ketik alamat URL aplikasi KPU Smart Archive pada bilah alamat (address bar).</li>
                <li>Pada halaman Login, masukkan <strong>Username</strong> Anda di kolom pertama.</li>
                <li>Masukkan <strong>Password</strong> Anda di kolom kedua dengan benar (perhatikan huruf besar/kecil).</li>
                <li>Klik tombol <strong>&quot;Login&quot;</strong> atau <strong>&quot;Masuk&quot;</strong>.</li>
                <li>Jika berhasil, Anda akan otomatis diarahkan ke halaman Dashboard utama. Jika gagal, periksa kembali penulisan username dan password Anda.</li>
              </ol>
              
              <h4 style={{ marginBottom: '8px' }}>B. Cara Keluar (Logout)</h4>
              <ol>
                <li>Lihat ke sudut kanan atas layar aplikasi.</li>
                <li>Klik pada nama atau ikon profil Anda.</li>
                <li>Pilih opsi <strong>&quot;Logout&quot;</strong> atau <strong>&quot;Keluar&quot;</strong> dari menu yang muncul.</li>
                <li>Anda akan dikembalikan ke halaman Login. Sangat disarankan untuk selalu melakukan Logout jika Anda menggunakan komputer publik atau berbagi komputer.</li>
              </ol>
            </div>
          </section>

          <section id="bab-2" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>2. Mengenal Dashboard Utama</h3>
            <p>Setelah login, Dashboard adalah halaman pertama yang Anda lihat. Halaman ini berfungsi sebagai panel kendali informasi:</p>
            <img src="/panduan/beranda.png" alt="Tampilan Beranda" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
            <div style={{ paddingLeft: '20px' }}>
              <ol>
                <li><strong>Kartu Statistik (Widget):</strong> Di bagian atas, terdapat kartu-kartu yang menampilkan angka total dokumen yang ada di sistem, jumlah pengguna, dan aktivitas hari ini.</li>
                <li><strong>Sidebar Navigasi (Menu Kiri):</strong> Menu utama untuk berpindah halaman. Terdiri dari Dashboard, Arsip, Pengaturan (khusus Admin), Panduan, dan Inbox.</li>
                <li><strong>Aktivitas Terbaru:</strong> Tabel singkat di halaman dashboard yang memperlihatkan dokumen-dokumen yang baru saja diunggah ke sistem beserta tanggal dan pengunggahnya.</li>
              </ol>
            </div>
          </section>

          <section id="bab-3" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>3. Manajemen Arsip (Menu Utama)</h3>
            <p>Ini adalah fitur paling penting. Klik menu <strong>&quot;Arsip&quot;</strong> di sidebar sebelah kiri untuk membuka halaman ini.</p>
            
            <div style={{ paddingLeft: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>A. Cara Mencari Arsip</h4>
              <img src="/panduan/arsip.png" alt="Tampilan Arsip" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Pada bagian atas tabel Arsip, cari kotak teks berlabel <strong>&quot;Cari dokumen...&quot;</strong>.</li>
                <li>Ketik nomor surat, judul dokumen, atau kata kunci yang Anda ingat.</li>
                <li>Sistem akan secara otomatis menyaring tabel saat Anda mengetik, menampilkan hanya dokumen yang relevan.</li>
                <li>Anda juga bisa menggunakan tombol <strong>Filter</strong> (jika tersedia) untuk menyaring dokumen khusus berdasarkan tahun tertentu atau klasifikasi tertentu saja.</li>
              </ol>

              <h4 style={{ marginBottom: '8px', marginTop: '24px' }}>B. Cara Menambahkan (Unggah) Arsip Baru</h4>
              <img src="/panduan/upload.png" alt="Tampilan Upload" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Di halaman Arsip, klik tombol berwarna biru <strong>&quot;+ Tambah Arsip&quot;</strong> di kanan atas tabel.</li>
                <li>Sebuah form isian akan muncul (berupa pop-up atau halaman baru).</li>
                <li>Isi <strong>Nomor Dokumen</strong> sesuai dengan nomor registrasi fisik surat.</li>
                <li>Isi <strong>Judul Dokumen</strong> dengan jelas dan deskriptif.</li>
                <li>Pilih <strong>Tanggal Dokumen</strong> dengan mengklik kolom tanggal, kalender kecil akan muncul untuk Anda pilih.</li>
                <li>Pada bagian <strong>Klasifikasi</strong>, pilih <em>Kategori Induk</em> terlebih dahulu (misal: HK - Hukum), kemudian pilih <em>Sub-Klasifikasi</em> spesifiknya (misal: HK.01 - Peraturan).</li>
                <li>Pada opsi <strong>Tingkat Keamanan</strong>, pilih <em>&quot;Biasa&quot;</em> jika dokumen boleh dilihat siapa saja, atau <em>&quot;Rahasia&quot;</em> jika dokumen bersifat tertutup (hanya Anda dan Admin yang bisa melihatnya nanti).</li>
                <li>Tambahkan <strong>Uraian Singkat / Deskripsi</strong> (opsional namun disarankan) untuk memudahkan pencarian di kemudian hari.</li>
                <li>Pada bagian file, klik kotak area unggah atau tombol <strong>&quot;Pilih File&quot;</strong>. Cari file PDF dokumen di komputer Anda (Pastikan ukuran file tidak melebihi 10MB).</li>
                <li>Setelah semua terisi dan file PDF sudah dipilih, klik tombol <strong>&quot;Simpan&quot;</strong>.</li>
                <li>Tunggu hingga progres unggahan selesai dan muncul notifikasi &quot;Berhasil&quot;. Arsip kini telah masuk ke tabel.</li>
              </ol>

              <h4 style={{ marginBottom: '8px', marginTop: '24px' }}>C. Cara Melihat, Mengunduh, Mengubah, dan Menghapus Arsip</h4>
              <p>Pada setiap baris dokumen di tabel Arsip, perhatikan kolom &quot;Aksi&quot; (Action) di sebelah paling kanan:</p>
              <img src="/panduan/detail%20dokumen.png" alt="Tampilan Detail Dokumen" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li><strong>Melihat Detail (Ikon Mata):</strong> Klik ikon ini untuk membuka layar pratinjau (preview) PDF langsung di browser Anda tanpa harus mengunduhnya, beserta seluruh metadata dokumen.</li>
                <li><strong>Mengunduh File (Ikon Panah Bawah/Download):</strong> Klik ikon ini jika Anda ingin menyimpan file PDF tersebut ke dalam folder komputer lokal Anda.</li>
                <li><strong>Mengedit Data (Ikon Pensil):</strong> Jika ada kesalahan ketik saat mengunggah, klik ikon ini. Form pengisian akan muncul kembali, Anda bisa memperbaiki judul, nomor, atau mengganti file, lalu klik &quot;Simpan Perubahan&quot;.</li>
                <li><strong>Menghapus (Ikon Tempat Sampah):</strong> Klik ikon ini untuk menghapus data. Sistem akan meminta konfirmasi (&quot;Apakah Anda yakin?&quot;). Jika ya, klik OK. <em>Catatan: Fitur hapus biasanya hanya terbuka untuk pengguna level Admin.</em></li>
              </ol>

              <h4 style={{ marginBottom: '8px', marginTop: '24px' }}>D. Mengembalikan Arsip yang Terhapus (Tong Sampah)</h4>
              <p>Arsip yang dihapus tidak langsung hilang, melainkan masuk ke Tong Sampah (Trash).</p>
              <img src="/panduan/trash.png" alt="Tampilan Tong Sampah" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Buka menu <strong>&quot;Tong Sampah&quot;</strong> di navigasi kiri (Jika Anda adalah Admin).</li>
                <li>Pilih dokumen yang ingin dikembalikan, lalu klik tombol <strong>&quot;Restore / Kembalikan&quot;</strong>.</li>
                <li>Dokumen akan kembali muncul di tabel Arsip utama. Jika Anda mengklik <strong>&quot;Hapus Permanen&quot;</strong>, barulah dokumen terhapus selamanya.</li>
              </ol>
            </div>
          </section>

          <section id="bab-4" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>4. Pengaturan Sistem (Menu Khusus Administrator)</h3>
            <p>Menu &quot;Pengaturan&quot; di sidebar hanya muncul jika Anda login sebagai akun dengan peran <strong>Admin</strong>.</p>
            <img src="/panduan/pengaturan.png" alt="Tampilan Pengaturan" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
            
            <div style={{ paddingLeft: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>A. Manajemen Pengguna</h4>
              <p>Berfungsi untuk menambah staf yang berhak mengakses sistem.</p>
              <img src="/panduan/user.png" alt="Tampilan Manajemen Pengguna" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Pilih <strong>Pengaturan &gt; Manajemen Pengguna</strong>.</li>
                <li>Untuk menambah akun, klik <strong>&quot;+ Tambah Pengguna&quot;</strong>.</li>
                <li>Isi Nama Lengkap, Username (yang akan dipakai login), dan Password (kata sandi awal).</li>
                <li>Pilih <strong>Role</strong>:
                  <ul>
                    <li><strong>Admin:</strong> Memiliki akses penuh termasuk menghapus data dan melihat semua dokumen rahasia.</li>
                    <li><strong>User:</strong> Hanya bisa mengunggah dokumen, melihat dokumen biasa, dan melihat dokumen rahasia miliknya sendiri.</li>
                  </ul>
                </li>
                <li>Klik &quot;Simpan&quot;. Jika ada pegawai yang mutasi/keluar, Admin dapat menggunakan ikon tempat sampah di sebelahnya untuk menghapus akun tersebut agar tidak bisa login lagi.</li>              </ol>

              <h4 style={{ marginBottom: '8px', marginTop: '24px' }}>B. Manajemen Klasifikasi</h4>
              <p>Berfungsi untuk mengatur daftar kategori surat/arsip di instansi.</p>
              <img src="/panduan/kategori.png" alt="Tampilan Manajemen Klasifikasi" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Pilih <strong>Pengaturan &gt; Klasifikasi</strong>.</li>
                <li>Tabel akan menampilkan daftar klasifikasi induk (Misal: KU - Keuangan).</li>
                <li>Untuk menambah kategori baru, klik <strong>&quot;+ Tambah Induk&quot;</strong>. Masukkan kode dan nama.</li>
                <li>Untuk menambah rincian dari kategori induk, klik tombol <strong>&quot;+ Tambah Sub-Klasifikasi&quot;</strong> pada baris kategori induk tersebut. Masukkan kode sub (Misal: KU.01) dan keterangannya.</li>                <li>Klasifikasi yang dibuat di sini akan muncul otomatis di pilihan dropdown (pilihan menu) saat pengguna biasa mengunggah arsip.</li>
              </ol>
            </div>
          </section>

          <section id="bab-5" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>5. Fitur Bantuan dan Pelaporan Bug (Feedback)</h3>
            <p>Jika pengguna mengalami kesulitan atau sistem tidak berjalan semestinya (error/bug), gunakan fitur ini:</p>
            <div style={{ paddingLeft: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>A. Cara Mengirim Laporan (Sebagai Pengguna Biasa/Admin)</h4>
              <img src="/panduan/support.png" alt="Tampilan Support" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Cari tombol melayang (widget) berlogo percakapan / tanda tanya di <strong>pojok kanan bawah</strong> layar Anda.</li>
                <li>Klik ikon tersebut, sebuah kotak form umpan balik akan muncul ke atas.</li>
                <li>Pilih <strong>Jenis Masalah:</strong> Apakah itu Bug (Kerusakan), Saran, atau Pertanyaan.</li>
                <li>Di kolom <strong>Deskripsi</strong>, ceritakan secara jelas langkah-langkah yang Anda lakukan sebelum menemukan error tersebut. (Contoh: &quot;Saat saya klik tombol simpan arsip HK.01, loading terus dan tidak tersimpan&quot;).</li>                <li><strong>Lampirkan Bukti (Opsional namun sangat disarankan):</strong> Klik area unggah gambar untuk melampirkan screenshot (tangkapan layar) komputer Anda yang memperlihatkan error tersebut.</li>
                <li>Klik <strong>&quot;Kirim Laporan&quot;</strong>.</li>
              </ol>

              <h4 style={{ marginBottom: '8px', marginTop: '24px' }}>B. Mengelola Laporan Masuk (Khusus Administrator)</h4>
              <img src="/panduan/evaluasi%20laporan.png" alt="Tampilan Evaluasi Laporan" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <ol>
                <li>Sebagai Admin, klik menu <strong>&quot;Inbox&quot;</strong> atau &quot;Laporan Masuk&quot; di sidebar kiri.</li>
                <li>Anda akan melihat daftar laporan yang dikirimkan oleh para pengguna.</li>
                <li>Klik pada salah satu baris laporan untuk melihat detail keluhan dan gambar screenshot yang dilampirkan.</li>
                <li>Jika masalah sedang diperbaiki oleh tim IT, ubah status laporan tersebut (melalui dropdown) dari &quot;Baru&quot; menjadi <strong>&quot;Diproses&quot;</strong>.</li>                <li>Jika masalah sudah tuntas, ubah statusnya menjadi <strong>&quot;Selesai&quot;</strong>. Pengguna pengirim secara konseptual mengetahui bahwa laporannya telah ditangani.</li>              </ol>
            </div>
          </section>

          <section id="bab-6" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>6. Log Aktivitas (Audit Trail)</h3>
            <p>Fitur keamanan ekstra untuk melacak setiap jejak rekam aktivitas yang terjadi dalam sistem.</p>
            <img src="/panduan/audit%20trail.png" alt="Tampilan Audit Trail" style={{ width: '100%', maxWidth: '700px', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
            <div style={{ paddingLeft: '20px' }}>
              <ol>
                <li>Menu <strong>Audit Trail</strong> (jika diaktifkan) hanya dapat diakses oleh Administrator.</li>
                <li>Berisi tabel rekam jejak kapan seseorang masuk (login), mengubah data, menghapus dokumen, atau keluar (logout).</li>
                <li>Ini berguna untuk forensik dan memastikan integritas data dalam sistem arsip tetap terjaga.</li>
              </ol>
            </div>
          </section>

          <section id="penutup" className="print-page-break" style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Penutup</h3>
            <p>Demikianlah Buku Panduan Penggunaan Aplikasi (User Manual) KPU Smart Archive ini disusun. Diharapkan panduan ini dapat memberikan arahan yang jelas, sehingga seluruh fitur yang ada dapat dimanfaatkan semaksimal mungkin untuk menciptakan tata kelola arsip yang modern, aman, dan dapat diandalkan.</p>
            <p>Terima kasih atas partisipasi dan komitmen Anda dalam menjaga kearsipan yang tertib. Mari bersama-sama kita wujudkan digitalisasi yang bermakna dan berkelanjutan.</p>
          </section>

          <div
            style={{
              marginTop: '60px',
              paddingTop: '20px',
              borderTop: '2px dashed var(--border)',
              fontSize: '12px',
              textAlign: 'center',
              color: 'var(--muted)'
            }}
          >
            © 2026 KPU Smart Archive - Dokumen panduan ini dikhususkan untuk lingkungan internal KPU. <br/>Dilarang menyebarluaskan panduan ini kepada pihak yang tidak berkepentingan tanpa izin Administrator.
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
          .print-page-break {
            page-break-before: always;
          }
          section {
            page-break-inside: auto;
          }
          h3, h4 {
            page-break-after: avoid;
          }
          img {
            page-break-inside: avoid;
            max-width: 100% !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
