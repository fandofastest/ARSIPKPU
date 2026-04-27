import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envPath = path.resolve(cwd, '.env');
const envFilePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

function slugify(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

type CategoryNode = {
  name: string;
  description?: string;
  children?: CategoryNode[];
};

function buildCategoryRows(nodes: CategoryNode[], parent?: { slug: string; path: string; level: number }) {
  const rows: Array<{
    name: string;
    slug: string;
    parentSlug: string;
    path: string;
    level: number;
    description: string;
  }> = [];

  for (const node of nodes) {
    const localSlug = slugify(node.name);
    const slug = parent ? slugify(`${parent.slug}-${localSlug}`) : localSlug;
    const catPath = parent ? `${parent.path} / ${node.name}` : node.name;
    const level = parent ? parent.level + 1 : 0;
    rows.push({
      name: node.name,
      slug,
      parentSlug: parent?.slug ?? '',
      path: catPath,
      level,
      description: node.description ?? ''
    });
    if (node.children?.length) {
      rows.push(...buildCategoryRows(node.children, { slug, path: catPath, level }));
    }
  }
  return rows;
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envFilePath });

  const { dbConnect } = await import('../src/lib/mongodb');
  const { Category } = await import('../src/models/Category');
  const { User } = await import('../src/models/User');

  await dbConnect();

  let admin = await User.findOne({ role: 'admin' }).lean();
  if (!admin) {
    admin = await User.findOne({ phone: '081234567890' }).lean();
  }
  if (!admin) {
    console.error('No admin user found. Please run: npm run seed');
    process.exit(1);
  }

  const tree: CategoryNode[] = [
    {
      name: 'Administrasi',
      children: [
        { name: 'Surat Masuk' },
        { name: 'Surat Keluar' },
        { name: 'Nota Dinas' },
        { name: 'Disposisi' },
        { name: 'Arsip Umum' }
      ]
    },
    {
      name: 'Keuangan',
      children: [
        { name: 'Anggaran' },
        { name: 'SPJ' },
        { name: 'Laporan Keuangan' },
        { name: 'Bukti Transaksi' }
      ]
    },
    {
      name: 'Kepegawaian',
      children: [
        { name: 'Data Pegawai' },
        { name: 'SK' },
        { name: 'Absensi' },
        { name: 'Cuti' }
      ]
    },
    {
      name: 'Kegiatan',
      children: [
        { name: 'Undangan' },
        { name: 'Dokumentasi' },
        { name: 'Laporan Kegiatan' }
      ]
    },
    {
      name: 'Pemilu',
      children: [
        { name: 'Data Pemilih' },
        { name: 'Pencalonan' },
        { name: 'Berita Acara' },
        { name: 'Rekapitulasi Suara' },
        { name: 'Sengketa' }
      ]
    },
    {
      name: 'Logistik',
      children: [
        { name: 'Distribusi' },
        { name: 'Inventaris' }
      ]
    },
    {
      name: 'Hukum',
      children: [
        { name: 'Peraturan' },
        { name: 'Kontrak' },
        { name: 'Dokumen Hukum' }
      ]
    },
    {
      name: 'Lainnya',
      children: [
        { name: 'Tidak Terklasifikasi' }
      ]
    }
  ];

  const items = buildCategoryRows(tree);

  await Category.deleteMany({});

  await Category.insertMany(
    items.map((it) => ({
      name: it.name,
      slug: it.slug,
      parentSlug: it.parentSlug,
      path: it.path,
      level: it.level,
      description: it.description,
      createdBy: { userId: admin._id, name: admin.name, phone: admin.phone },
      status: 'active'
    }))
  );

  console.log('Seed categories + subcategories completed:', items.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
