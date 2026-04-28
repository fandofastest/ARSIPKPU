'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';

type Bucket = { label: string; value: number };

type MonevData = {
  total: number;
  avgRating: string;
  totalNew: number;
  totalReviewed: number;
  totalResolved: number;
  byCategory: Bucket[];
};

type StatsResp =
  | { success: true; data: MonevData }
  | { error: string };

type MeResp =
  | { success: true; data: { userId: string; role: string } }
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
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Belum ada data</div>
      ) : (
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
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
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                  {slice.label.charAt(0).toUpperCase() + slice.label.slice(1)}
                </div>
                <div style={{ color: 'var(--muted)', fontWeight: 700, width: 54, textAlign: 'right', fontSize: 13 }}>{slice.percent.toFixed(1)}%</div>
                <div style={{ color: 'var(--muted)', fontWeight: 700, width: 30, textAlign: 'right', fontSize: 13 }}>{slice.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonevPage() {
  const [stats, setStats] = useState<MonevData | null>(null);
  const [meRole, setMeRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then((j: MeResp) => {
        if ('success' in j) {
          setMeRole(j.data.role);
          if (j.data.role === 'admin') {
            return fetch('/api/monev/stats', { credentials: 'include' });
          }
        }
        return null;
      })
      .then(res => res?.json())
      .then((data: StatsResp | null) => {
        if (data && 'success' in data) {
          setStats(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && meRole !== 'admin') {
    return (
      <AppShell>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <h1 style={{ color: 'var(--danger)' }}>Akses Terbatas</h1>
            <p style={{ color: 'var(--muted)' }}>Halaman Monitoring & Evaluasi (Monev) hanya dapat diakses oleh Administrator.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Monev & Laporan Pengguna</h1>
        <div className="pageHeroText" style={{ marginBottom: 24 }}>
          Pantau statistik masukan, tingkat kepuasan pengguna, dan laporan bug dari sistem secara real-time.
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Memuat data Monev...</div>
        ) : (
          <>
            <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div className="card statCard" style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>Rata-rata Rating</div>
                <div className="statValue" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 28 }}>
                  <span style={{ color: '#f59e0b' }}>★</span> {stats?.avgRating || '0.0'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Dari {stats?.total} masukan</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>Tiket Baru</div>
                <div className="statValue" style={{ color: 'var(--danger)', fontSize: 28 }}>{stats?.totalNew}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Perlu segera ditinjau</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>Tiket Sedang Ditinjau</div>
                <div className="statValue" style={{ color: 'var(--warning)', fontSize: 28 }}>{stats?.totalReviewed}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Dalam proses pengecekan</div>
              </div>
              <div className="card statCard" style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>Tiket Selesai</div>
                <div className="statValue" style={{ color: 'var(--success)', fontSize: 28 }}>{stats?.totalResolved}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Telah berhasil ditangani</div>
              </div>
            </div>

            <div style={{ height: 24 }} />

            <div className="row">
              <PieChartCard title="Sebaran Kategori Laporan" data={stats?.byCategory || []} />
            </div>
            
            <div style={{ height: 24 }} />
            
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h2 style={{ margin: '0 0 12px 0' }}>Manajemen Tiket & Laporan</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 15 }}>
                Buka halaman manajemen untuk melihat detail setiap laporan, melihat lampiran foto, dan memperbarui status penanganan tiket.
              </p>
              <Link href="/feedback" className="btn btnPrimary" style={{ padding: '12px 24px' }}>
                Kelola Semua Laporan &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
