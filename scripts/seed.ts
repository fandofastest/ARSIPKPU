import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envPath = path.resolve(cwd, '.env');
const envFilePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

type FeedbackCategory = 'kuisioner';
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
  const subject = `${SEED_PREFIX} Kuisioner Pemahaman Penggunaan`;

  const answerLevels = [
    'Sangat paham',
    'Cukup paham',
    'Perlu panduan ulang singkat'
  ] as const;
  const easeLevels = [
    'Sangat mudah',
    'Cukup mudah',
    'Kadang membingungkan'
  ] as const;
  const confusingParts = [
    'Penentuan kategori/subkategori dan konsistensi penamaan',
    'Perbedaan arsip DINAMIS vs STATIS dan implikasi retensi',
    'Akses/visibility (public/private/shared) saat berbagi arsip',
    'Pengisian metadata (nomor surat, unit, jenis dokumen) agar seragam'
  ] as const;
  const helpfulFeatures = [
    'Pencarian cepat (nama/nomor surat/isi dokumen OCR)',
    'Nomor arsip otomatis dan penamaan file standar',
    'Audit log aktivitas untuk pelacakan',
    'Panduan pengguna + tombol cetak/simpan PDF'
  ] as const;
  const improvementSuggestions = [
    'Tambah contoh pengisian metadata (nomor surat & tanggal) di form upload',
    'Tambah validasi/auto-suggestion kategori agar tidak terjadi variasi penulisan',
    'Tampilkan indikator progress per file saat upload banyak dokumen',
    'Buat “ringkasan filter aktif” dan tombol reset filter di halaman Arsip'
  ] as const;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let reviewedSeeded = 0;

  for (const u of users) {
    const userId = String(u._id);
    const phone = String(u.phone ?? '').trim();
    if (!userId || !phone) {
      skipped += 1;
      continue;
    }

    const existingSeed = await Feedback.findOne({
      'submittedBy.userId': userId,
      subject: seedSubjectRegex
    })
      .select({ _id: 1 })
      .lean();

    const displayName = String(u.nama || u.name || 'Pengguna').trim() || 'Pengguna';
    const role = String(u.role || 'staff');
    const seed = hashStringToInt(`${userId}|${phone}|${role}`);
    const status = deriveStatus(seed, Boolean(reviewer));

    const overallRating = ((seed % 100) < 15 ? 4 : 5) as 4 | 5;
    const a1 = pick(answerLevels, seed);
    const a2 = pick(easeLevels, seed + 1);
    const a3 = pick(confusingParts, seed + 2);
    const a4 = pick(helpfulFeatures, seed + 3);
    const a5 = pick(improvementSuggestions, seed + 4);

    const message =
      `Identitas:\n` +
      `- Nama: ${displayName}\n` +
      `- Role: ${role}\n` +
      `- Kontak: ${phone}\n\n` +
      `Kuisioner Pemahaman Penggunaan KPU Smart Archive:\n` +
      `1) Seberapa paham alur unggah + pengisian metadata (kategori, nomor surat, tanggal, unit, jenis dokumen)?\n` +
      `   Jawaban: ${a1}\n\n` +
      `2) Seberapa mudah melakukan pencarian arsip (nama file/nomor surat/isi dokumen hasil OCR)?\n` +
      `   Jawaban: ${a2}\n\n` +
      `3) Bagian yang masih membingungkan:\n` +
      `   Jawaban: ${a3}\n\n` +
      `4) Fitur yang paling membantu:\n` +
      `   Jawaban: ${a4}\n\n` +
      `5) Saran perbaikan prioritas:\n` +
      `   Jawaban: ${a5}\n`;

    const doc: Record<string, unknown> = {
      category: 'kuisioner' satisfies FeedbackCategory,
      subject,
      message,
      rating: overallRating,
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

    if (existingSeed && (existingSeed as { _id?: unknown })._id) {
      await Feedback.updateOne({ _id: (existingSeed as { _id: unknown })._id }, { $set: doc });
      updated += 1;
    } else {
      await Feedback.create(doc);
      created += 1;
    }
  }

  console.log(
    `Seed kuisioner: created=${created}, updated=${updated}, skipped=${skipped}, totalUsers=${users.length}, reviewedOrResolved=${reviewedSeeded}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
