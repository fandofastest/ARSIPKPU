'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  UserCheck,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Clock,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  PieChart as PieIcon
} from 'lucide-react';

type ArchiveItem = {
  _id: string;
  originalName: string;
  filename: string;
  createdAt: string;
  uploadedBy: { phone: string; name: string };
};

type ListResp =
  | {
      success: true;
      data: ArchiveItem[];
      meta: { total: number };
    }
  | { error: string };

type MeResp =
  | { success: true; data: { phone: string; name: string } }
  | { error: string };

type Bucket = { label: string; value: number };

type StatsResp =
  | {
      success: true;
      data: {
        byCategory: Bucket[];
        byUploader: Bucket[];
        lifecycle: Bucket[];
        retentionAlerts: {
          pendingDisposals: number;
          unreadNotifications: number;
        };
      };
    }
  | { error: string };

const PIE_COLORS = [
  '#dc2626', // Red
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4f46e5', // Indigo
  '#65a30d', // Lime
  '#ea580c'  // Orange
];

function PieChartCard({
  title,
  subtitle,
  data,
  onSelect
}: {
  title: string;
  subtitle?: string;
  data: Bucket[];
  onSelect: (label: string) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((sum, it) => sum + it.value, 0);
  const size = 200;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const slices = data.map((it, idx) => {
    const ratio = total > 0 ? it.value / total : 0;
    const length = ratio * circumference;
    const offset = circumference - accumulated;
    accumulated += length;
    return {
      label: it.label,
      value: it.value,
      color: PIE_COLORS[idx % PIE_COLORS.length],
      length,
      offset,
      percent: ratio * 100
    };
  });

  return (
    <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex-1 min-w-[300px]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          Total {total}
        </span>
      </div>

      {total <= 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          Belum ada data visualisasi
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                className="stroke-slate-100 dark:stroke-slate-800/80"
                strokeWidth={strokeWidth}
              />
              {slices.map((slice, idx) => (
                <circle
                  key={`${slice.label}-${idx}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                  strokeDashoffset={slice.offset}
                  className="cursor-pointer transition-all duration-200 hover:opacity-90"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelect(slice.label)}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {hoveredIdx !== null ? slices[hoveredIdx].value : total}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {hoveredIdx !== null ? slices[hoveredIdx].label : 'Arsip'}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
            {slices.map((slice, idx) => (
              <button
                key={`${slice.label}-legend-${idx}`}
                type="button"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelect(slice.label)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-xs text-left transition-all ${
                  hoveredIdx === idx
                    ? 'bg-slate-100 dark:bg-slate-800 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <span
                    className="w-3 h-3 rounded-md flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{slice.label}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 font-semibold">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">{slice.percent.toFixed(1)}%</span>
                  <span className="text-slate-800 dark:text-slate-200 min-w-[24px] text-right">{slice.value}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ phone: string; name: string } | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [mineTotal, setMineTotal] = useState<number>(0);
  const [recent, setRecent] = useState<ArchiveItem[]>([]);
  const [byCategory, setByCategory] = useState<Bucket[]>([]);
  const [byUploader, setByUploader] = useState<Bucket[]>([]);
  const [lifecycle, setLifecycle] = useState<Bucket[]>([]);
  const [retentionAlerts, setRetentionAlerts] = useState({ pendingDisposals: 0, unreadNotifications: 0 });

  const loading = useMemo(() => me === null && recent.length === 0 && total === 0, [me, recent.length, total]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json() as Promise<MeResp>)
      .then((d) => {
        if ('success' in d) setMe(d.data);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    fetch('/api/archive?limit=5&page=1', { credentials: 'include' })
      .then((r) => r.json() as Promise<ListResp>)
      .then((d) => {
        if ('success' in d) {
          setTotal(d.meta.total);
          setRecent(d.data);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    if (!me?.phone) return;
    fetch(`/api/archive?limit=1&page=1&uploader=${encodeURIComponent(me.phone)}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<ListResp>)
      .then((d) => {
        if ('success' in d) setMineTotal(d.meta.total);
      })
      .catch(() => {
        // ignore
      });
  }, [me?.phone]);

  useEffect(() => {
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then((r) => r.json() as Promise<StatsResp>)
      .then((d) => {
        if ('success' in d) {
          setByCategory(d.data.byCategory);
          setByUploader(d.data.byUploader);
          setLifecycle(d.data.lifecycle || []);
          setRetentionAlerts(d.data.retentionAlerts || { pendingDisposals: 0, unreadNotifications: 0 });
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  function openFilesByCategory(label: string) {
    const sp = new URLSearchParams();
    sp.set('category', label);
    router.push(`/files?${sp.toString()}`);
  }

  function openFilesByUploader(label: string) {
    const sp = new URLSearchParams();
    sp.set('uploader', label);
    router.push(`/files?${sp.toString()}`);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Banner Hero Panel */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-red-700 to-rose-900 text-white p-6 md:p-8 shadow-xl shadow-red-900/20 border border-red-500/30">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Pusat Kendali Arsip Digital</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Selamat Datang, {me?.name || 'Pengguna'} 👋
              </h1>
              <p className="text-sm text-red-100/90 leading-relaxed">
                Kelola produk hukum, klasifikasi surat keputusan, dan telusuri teks OCR secara otomatis dalam satu sistem terpadu KPU Dumai.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/files"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-red-700 font-bold text-xs shadow-lg hover:bg-red-50 transition-all duration-150"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Jelajahi Arsip</span>
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-800/60 hover:bg-red-800/80 text-white font-semibold text-xs border border-white/20 transition-all duration-150"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Unggah Dokumen Baru</span>
                </Link>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-col gap-2.5 self-start md:self-center flex-shrink-0">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/15 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Sistem Aktif & Terlindungi</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/15 text-xs font-medium">
                <FileCheck2 className="w-4 h-4 text-blue-300" />
                <span>Worker OCR Terhubung</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Arsip Aktif
              </span>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{total}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Dokumen tersimpan di database</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Arsip Anda
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{mineTotal}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Diunggah oleh akun Anda
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Peringatan Retensi
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {retentionAlerts.pendingDisposals}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Menunggu persetujuan pemusnahan · {retentionAlerts.unreadNotifications} notifikasi
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          <PieChartCard
            title="File per Kategori"
            subtitle="Distribusi jenis dokumen hukum"
            data={byCategory}
            onSelect={openFilesByCategory}
          />
          <PieChartCard
            title="File per Uploader"
            subtitle="Kontribusi unggahan pengguna"
            data={byUploader}
            onSelect={openFilesByUploader}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <PieChartCard
            title="Siklus Hidup (Lifecycle)"
            subtitle="Status retensi arsip aktif vs inaktif"
            data={lifecycle}
            onSelect={() => undefined}
          />
        </div>

        {/* Recent Uploads Table Card */}
        <div className="bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-red-600" />
                Unggahan Terbaru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daftar 5 dokumen terakhir yang masuk ke dalam sistem
              </p>
            </div>
            <Link
              href="/files"
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-6">Nama File Dokumen</th>
                  <th className="py-3.5 px-6">Pengunggah</th>
                  <th className="py-3.5 px-6">Waktu Upload</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {recent.map((it) => (
                  <tr key={it._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-slate-100 max-w-md truncate">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate">{it.originalName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-medium">
                      {it.uploadedBy?.name || '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                      {new Date(it.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/files?q=${encodeURIComponent(it.originalName)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      Belum ada dokumen yang diunggah
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
