import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envPath = path.resolve(cwd, '.env');
const envFilePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

type FeedbackCategory = 'kritik' | 'saran' | 'bug' | 'fitur' | 'lainnya';
type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

function hashStringToInt(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number) {
  if (!arr.length) throw new Error('pick() empty array');
  return arr[seed % arr.length];
}

function deriveStatus(seed: number, hasReviewer: boolean): FeedbackStatus {
  if (!hasReviewer) return 'new';
  const m = seed % 100;
  if (m < 70) return 'new';
  if (m < 90) return 'reviewed';
  return 'resolved';
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envFilePath });

  const { dbConnect } = await import('../src/lib/mongodb');
  const { User } = await import('../src/models/User');
  const { Feedback } = await import('../src/models/Feedback');

  await dbConnect();

  const nip = '000000000000000000';
  const phone = '081234567890';

  const passwordHash = await bcrypt.hash('admin123', 12);

  const existing = await User.findOne({ $or: [{ nip }, { phone }] });
  if (existing) {
    existing.name = 'Administrator';
    (existing as { nama?: string }).nama = 'Administrator';
    (existing as { nip?: string }).nip = nip;
    existing.phone = phone;
    existing.password = passwordHash;
    existing.role = 'admin';
    await existing.save();
    console.log('Seed completed. Updated admin:', nip);
  } else {
    await User.create({ name: 'Administrator', nama: 'Administrator', nip, phone, password: passwordHash, role: 'admin' });
    console.log('Seed completed. Created admin:', nip);
  }

  const users = (await User.find({})
    .select({ name: 1, nama: 1, phone: 1, role: 1 })
    .lean()) as Array<{ _id: unknown; name?: string; nama?: string; phone?: string; role?: string }>;

  const adminReviewer = users.find((u) => String(u.role) === 'admin') ?? null;
  const reviewer =
    adminReviewer && adminReviewer.phone
      ? {
          userId: String(adminReviewer._id),
          name: String(adminReviewer.nama || adminReviewer.name || 'Administrator'),
          phone: String(adminReviewer.phone)
        }
      : null;

  const SEED_PREFIX = '[SEED-QUIZ]';
  const seedSubjectRegex = new RegExp(`^${escapeRegex(SEED_PREFIX)}`);
  const templates: Array<{
    category: FeedbackCategory;
    rating: number;
    subject: string;
    message: string;
  }> = [
    {
      category: 'saran',
      rating: 5,
      subject: `${SEED_PREFIX} Pengalaman penggunaan aplikasi`,
      message:
        'Secara umum aplikasi sangat membantu untuk penyimpanan dan pencarian arsip. Saran kecil: tambahkan tombol “reset filter” di halaman Arsip, dan tampilkan ringkasan filter aktif agar pengguna tidak bingung saat hasil pencarian kosong.'
    },
    {
      category: 'fitur',
      rating: 5,
      subject: `${SEED_PREFIX} Usulan fitur pencarian lanjutan`,
      message:
        'Mohon pertimbangkan fitur pencarian lanjutan (multi-filter) dengan opsi: rentang tanggal dokumen, unit pengirim/penerima, jenis dokumen, serta highlight kata kunci pada hasil. Ini akan sangat mempercepat temuan arsip saat kebutuhan mendesak.'
    },
    {
      category: 'bug',
      rating: 4,
      subject: `${SEED_PREFIX} Perbaikan kecil pengalaman upload`,
      message:
        'Saat upload beberapa file sekaligus, akan lebih jelas jika ada indikator progress per file (mis. nama file + status “mengunggah/selesai”). Kalau upload gagal, mohon tampilkan alasan (ukuran terlalu besar/format tidak didukung) agar pengguna bisa memperbaiki tanpa coba-coba.'
    },
    {
      category: 'kritik',
      rating: 4,
      subject: `${SEED_PREFIX} Konsistensi label & navigasi`,
      message:
        'Tampilan sudah rapi, namun beberapa label menu/kolom sebaiknya diseragamkan (misalnya istilah “Jenis Dokumen” vs “Type”). Konsistensi istilah memudahkan pelatihan pengguna baru dan mengurangi kesalahan input metadata.'
    },
    {
      category: 'lainnya',
      rating: 5,
      subject: `${SEED_PREFIX} Kebutuhan panduan singkat`,
      message:
        'Panduan pengguna sangat membantu. Akan lebih baik jika ada versi ringkas “3 langkah cepat” (unggah → isi metadata → simpan) dan contoh pengisian nomor surat/tanggal untuk menghindari variasi penulisan yang membuat pencarian kurang akurat.'
    }
  ];

  let created = 0;
  let skipped = 0;
  let reviewedSeeded = 0;

  for (const u of users) {
    const userId = String(u._id);
    const phone = String(u.phone ?? '').trim();
    if (!userId || !phone) {
      skipped += 1;
      continue;
    }

    const already = await Feedback.findOne({
      'submittedBy.userId': userId,
      subject: seedSubjectRegex
    })
      .select({ _id: 1 })
      .lean();
    if (already) {
      skipped += 1;
      continue;
    }

    const displayName = String(u.nama || u.name || 'Pengguna').trim() || 'Pengguna';
    const role = String(u.role || 'staff');
    const seed = hashStringToInt(`${userId}|${phone}|${role}`);
    const tpl = pick(templates, seed);
    const status = deriveStatus(seed, Boolean(reviewer));

    const doc: Record<string, unknown> = {
      category: tpl.category,
      subject: tpl.subject,
      message: `Nama: ${displayName}\nRole: ${role}\n\n${tpl.message}`,
      rating: tpl.rating,
      status,
      attachments: [],
      submittedBy: {
        userId,
        name: displayName,
        phone,
        role
      }
    };

    if (status !== 'new' && reviewer) {
      doc.reviewedBy = reviewer;
      doc.reviewedAt = new Date();
      reviewedSeeded += 1;
    }

    await Feedback.create(doc);
    created += 1;
  }

  console.log(`Seed feedback/quisioner: created=${created}, skipped=${skipped}, totalUsers=${users.length}, reviewedOrResolved=${reviewedSeeded}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
