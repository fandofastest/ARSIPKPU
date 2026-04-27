'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';

type Bucket = { label: string; value: number };

type StatsResp =
  | {
      success: true;
      data: {
        total: number;
        avgRating: string;
        totalNew: number;
        totalReviewed: number;
        totalResolved: number;
        byCategory: Bucket[];
      };
    }
  | { error: string };

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

function PieChartCard({
  title,
  data
}: {
  title: string;
  data: Bucket[];
}) {
  const total = data.reduce((sum, it) => sum + it.value, 0);
  const size = 220;
  const strokeWidth = 44;
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
    <div className="card" style={{ flex: 1, minWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Total {total}</span>
      </div>

      {total <= 0 ? (
        <div style={{ color: 'var(--muted)' }}>Belum ada data</div>
      ) : (
        <div className="row" style={{ alignItems: 'center' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="color-mix(in srgb, var(--secondary) 78%, transparent)" strokeWidth={strokeWidth} />
            {slices.map((slice, idx) => (
              <circle
                key={`${slice.label}-${idx}`}
                cx={cx} cy={cy} r={radius} fill="none"
                stroke={slice.color} strokeWidth={strokeWidth}
                strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                strokeDashoffset={slice.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            ))}
          </svg>
          <div style={{ flex: 1, minWidth: 180 }}>
            {slices.map((slice, idx) => (
              <div key={`${slice.label}-legend-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, flex: '0 0 auto' }} />
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {slice.label.charAt(0).toUpperCase() + slice.label.slice(1)}
                </div>
                <div style={{ color: 'var(--muted)', fontWeight: 700, width: 54, textAlign: 'right' }}>{slice.percent.toFixed(1)}%</div>
                <div style={{ color: 'var(--muted)', fontWeight: 700 }}>{slice.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonevPage() {
  const [stats, setStats] = useState<StatsResp['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monev/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Monev & Laporan Pengguna</h1>
        <div className="pageHeroText" style={{ marginBottom: 24 }}>
          Pantau statistik masukan, tingkat kepuasan pengguna, dan laporan bug dari sistem.
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Memuat data Monev...</div>
        ) : (
          <>
            <div className="row">
              <div className="card statCard" style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: 'var(--muted)' }}>Rata-rata Rating</div>
                <div className="statValue" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#f59e0b' }}>★</span> {stats?.avgRating}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Dari semua masukan pengguna</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: 'var(--muted)' }}>Total Masukan</div>
                <div className="statValue">{stats?.total}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Kritik, Saran & Bug</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: 'var(--muted)' }}>Tiket Baru (Pending)</div>
                <div className="statValue" style={{ color: 'var(--danger)' }}>{stats?.totalNew}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Perlu segera ditinjau</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: 'var(--muted)' }}>Tiket Selesai</div>
                <div className="statValue" style={{ color: 'var(--success)' }}>{stats?.totalResolved}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Telah ditangani</div>
              </div>
            </div>

            <div style={{ height: 24 }} />

            <div className="row">
              <PieChartCard title="Kategori Laporan" data={stats?.byCategory || []} />
            </div>
            
            <div style={{ height: 24 }} />
            
            <div className="card">
              <h2 style={{ margin: '0 0 16px 0' }}>Manajemen Tiket</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
                Buka halaman Kritik & Saran untuk melihat daftar lengkap dan mengelola tiket laporan.
              </p>
              <Link href="/feedback" className="btn btnPrimary">
                Kelola Semua Laporan
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
