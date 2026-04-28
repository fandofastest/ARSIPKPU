// seed-cat.js - run via: mongosh kpuarchive --file seed-cat.js -u admin -p Palang66 --authenticationDatabase admin
db.categories.deleteMany({});
const sys = { userId: ObjectId(), name: 'system', phone: '-' };
const now = new Date();
function cat(name, slug, parentSlug, path, level, desc) {
  return { name, slug, parentSlug, path, level, description: desc || '', createdBy: sys, status: 'active', createdAt: now };
}
db.categories.insertMany([
  cat('Administrasi','administrasi','','Administrasi',0),
  cat('Surat Masuk','administrasi-surat-masuk','administrasi','Administrasi / Surat Masuk',1),
  cat('Surat Keluar','administrasi-surat-keluar','administrasi','Administrasi / Surat Keluar',1),
  cat('Nota Dinas','administrasi-nota-dinas','administrasi','Administrasi / Nota Dinas',1),
  cat('Disposisi','administrasi-disposisi','administrasi','Administrasi / Disposisi',1),
  cat('Arsip Umum','administrasi-arsip-umum','administrasi','Administrasi / Arsip Umum',1),
  cat('Keuangan','keuangan','','Keuangan',0),
  cat('Anggaran','keuangan-anggaran','keuangan','Keuangan / Anggaran',1),
  cat('SPJ','keuangan-spj','keuangan','Keuangan / SPJ',1),
  cat('Laporan Keuangan','keuangan-laporan-keuangan','keuangan','Keuangan / Laporan Keuangan',1),
  cat('Bukti Transaksi','keuangan-bukti-transaksi','keuangan','Keuangan / Bukti Transaksi',1),
  cat('Kepegawaian','kepegawaian','','Kepegawaian',0),
  cat('Data Pegawai','kepegawaian-data-pegawai','kepegawaian','Kepegawaian / Data Pegawai',1),
  cat('SK','kepegawaian-sk','kepegawaian','Kepegawaian / SK',1),
  cat('Absensi','kepegawaian-absensi','kepegawaian','Kepegawaian / Absensi',1),
  cat('Cuti','kepegawaian-cuti','kepegawaian','Kepegawaian / Cuti',1),
  cat('Kegiatan','kegiatan','','Kegiatan',0),
  cat('Undangan','kegiatan-undangan','kegiatan','Kegiatan / Undangan',1),
  cat('Dokumentasi','kegiatan-dokumentasi','kegiatan','Kegiatan / Dokumentasi',1),
  cat('Laporan Kegiatan','kegiatan-laporan-kegiatan','kegiatan','Kegiatan / Laporan Kegiatan',1),
  cat('Pemilu','pemilu','','Pemilu',0,'Retensi minimal 10 tahun'),
  cat('Data Pemilih','pemilu-data-pemilih','pemilu','Pemilu / Data Pemilih',1),
  cat('Pencalonan','pemilu-pencalonan','pemilu','Pemilu / Pencalonan',1),
  cat('Berita Acara','pemilu-berita-acara','pemilu','Pemilu / Berita Acara',1),
  cat('Rekapitulasi Suara','pemilu-rekapitulasi-suara','pemilu','Pemilu / Rekapitulasi Suara',1),
  cat('Sengketa','pemilu-sengketa','pemilu','Pemilu / Sengketa',1),
  cat('Logistik','logistik','','Logistik',0),
  cat('Distribusi','logistik-distribusi','logistik','Logistik / Distribusi',1),
  cat('Inventaris','logistik-inventaris','logistik','Logistik / Inventaris',1),
  cat('Hukum','hukum','','Hukum',0),
  cat('Peraturan','hukum-peraturan','hukum','Hukum / Peraturan',1),
  cat('Kontrak','hukum-kontrak','hukum','Hukum / Kontrak',1),
  cat('Dokumen Hukum','hukum-dokumen-hukum','hukum','Hukum / Dokumen Hukum',1),
  cat('Lainnya','lainnya','','Lainnya',0),
  cat('Tidak Terklasifikasi','lainnya-tidak-terklasifikasi','lainnya','Lainnya / Tidak Terklasifikasi',1),
]);
print('SEED OK: ' + db.categories.countDocuments() + ' categories inserted');
