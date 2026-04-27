// === ENUM CONSTANTS ===
export const ACCESS_LEVEL = ['BIASA', 'TERBATAS', 'RAHASIA'] as const;
export type AccessLevel = (typeof ACCESS_LEVEL)[number];

export const ARCHIVE_TYPE = ['DINAMIS', 'STATIS'] as const;
export type ArchiveType = (typeof ARCHIVE_TYPE)[number];

// === CATEGORY STRUCTURE (single source of truth) ===
export type SubcategoryDef = { name: string; code: string };
export type CategoryDef = { name: string; code: string; subcategories: SubcategoryDef[] };

export const CATEGORY_TREE: CategoryDef[] = [
  {
    name: 'Administrasi', code: 'ADM',
    subcategories: [
      { name: 'Surat Masuk', code: 'ADM-SM' },
      { name: 'Surat Keluar', code: 'ADM-SK' },
      { name: 'Nota Dinas', code: 'ADM-ND' },
      { name: 'Disposisi', code: 'ADM-DSP' },
      { name: 'Arsip Umum', code: 'ADM-UM' }
    ]
  },
  {
    name: 'Keuangan', code: 'KEU',
    subcategories: [
      { name: 'Anggaran', code: 'KEU-ANG' },
      { name: 'SPJ', code: 'KEU-SPJ' },
      { name: 'Laporan Keuangan', code: 'KEU-LK' },
      { name: 'Bukti Transaksi', code: 'KEU-BT' }
    ]
  },
  {
    name: 'Kepegawaian', code: 'PEG',
    subcategories: [
      { name: 'Data Pegawai', code: 'PEG-DP' },
      { name: 'SK', code: 'PEG-SK' },
      { name: 'Absensi', code: 'PEG-ABS' },
      { name: 'Cuti', code: 'PEG-CT' }
    ]
  },
  {
    name: 'Kegiatan', code: 'KGT',
    subcategories: [
      { name: 'Undangan', code: 'KGT-UND' },
      { name: 'Dokumentasi', code: 'KGT-DOK' },
      { name: 'Laporan Kegiatan', code: 'KGT-LAP' }
    ]
  },
  {
    name: 'Pemilu', code: 'PML',
    subcategories: [
      { name: 'Data Pemilih', code: 'PML-DPT' },
      { name: 'Pencalonan', code: 'PML-CAL' },
      { name: 'Berita Acara', code: 'PML-BA' },
      { name: 'Rekapitulasi Suara', code: 'PML-REK' },
      { name: 'Sengketa', code: 'PML-SKT' }
    ]
  },
  {
    name: 'Logistik', code: 'LOG',
    subcategories: [
      { name: 'Distribusi', code: 'LOG-DIS' },
      { name: 'Inventaris', code: 'LOG-INV' }
    ]
  },
  {
    name: 'Hukum', code: 'HKM',
    subcategories: [
      { name: 'Peraturan', code: 'HKM-PRT' },
      { name: 'Kontrak', code: 'HKM-KNT' },
      { name: 'Dokumen Hukum', code: 'HKM-DHK' }
    ]
  },
  {
    name: 'Lainnya', code: 'OTH',
    subcategories: [
      { name: 'Tidak Terklasifikasi', code: 'OTH-UNK' }
    ]
  }
];

// Map for quick lookup: categoryCode -> CategoryDef
export const CATEGORY_MAP = new Map<string, CategoryDef>(
  CATEGORY_TREE.map((c) => [c.code, c])
);

// Map for quick lookup: subcategoryCode -> SubcategoryDef
export const SUBCATEGORY_MAP = new Map<string, SubcategoryDef>(
  CATEGORY_TREE.flatMap((c) => c.subcategories.map((s) => [s.code, s]))
);

// Validate that subcategory belongs to category
export function isValidSubcategoryOf(categoryCode: string, subcategoryCode: string): boolean {
  const cat = CATEGORY_MAP.get(categoryCode);
  if (!cat) return false;
  return cat.subcategories.some((s) => s.code === subcategoryCode);
}

// Get minimum retention years for a category (Rule #4)
export function getMinRetentionYears(categoryCode: string): number {
  if (categoryCode === 'PML') return 10;
  return 0;
}
