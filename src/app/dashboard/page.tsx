'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const PIE_COLORS = ['#dc2626', '#ef4444', '#b91c1c', '#f87171', '#991b1b', '#fca5a5', '#7f1d1d', '#fecaca', '#450a0a', '#fee2e2'];

function PieChartCard({
  title,
  data,
  onSelect
}: {
  title: string;
  data: Bucket[];
  onSelect: (label: string) => void;
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
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={title}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="color-mix(in srgb, var(--secondary) 78%, transparent)"
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
                strokeWidth={strokeWidth}
                strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                strokeDashoffset={slice.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(slice.label)}
              />
            ))}
          </svg>

          <div style={{ flex: 1, minWidth: 180 }}>
            {slices.map((slice, idx) => (
              <button
                key={`${slice.label}-legend-${idx}`}
                type="button"
                onClick={() => onSelect(slice.label)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slice.label}</div>
                <div style={{ color: 'var(--muted)', fontWeight: 700, width: 54, textAlign: 'right' }}>{slice.percent.toFixed(1)}%</div>
                <div style={{ color: 'var(--muted)', fontWeight: 700 }}>{slice.value}</div>
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
      <div className="container">
        <div className="heroPanel">
          <div>
            <h1 style={{ margin: 0 }}>Pusat Kendali Arsip</h1>
            <div className="pageHeroText">
              Lihat ringkasan dokumen, jelajahi kategori, dan buka arsip dengan cepat.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <Link className="btn" href="/files">
                Buka Daftar Arsip
              </Link>
              <Link className="btn btnSecondary" href="/docs/integrations">
                Lihat API Docs
              </Link>
            </div>
          </div>
          <div className="heroBadgeWrap">
            <span className="badge badgeInfo">
              <span className="badgeDot" />
              Sistem Aktif
            </span>
            <span className="badge badgeSuccess">
              <span className="badgeDot" />
              Upload Monitoring
            </span>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div className="row">
          <div className="card statCard" style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'var(--muted)' }}>Total Arsip Aktif</div>
            <div className="statValue">{total}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Semua dokumen yang tersedia saat ini</div>
          </div>
          <div className="card statCard" style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'var(--muted)' }}>Arsip Anda</div>
            <div className="statValue">{mineTotal}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Dokumen yang diunggah oleh akun Anda</div>
          </div>
          <div className="card statCard" style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'var(--muted)' }}>Retention Alerts</div>
            <div className="statValue">{retentionAlerts.pendingDisposals}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              Pending disposal approvals · notifications: {retentionAlerts.unreadNotifications}
            </div>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div className="row">
          <PieChartCard title="File per Kategori" data={byCategory} onSelect={openFilesByCategory} />
          <PieChartCard title="File per User" data={byUploader} onSelect={openFilesByUploader} />
        </div>

        <div style={{ height: 16 }} />

        <div className="row">
          <PieChartCard title="Lifecycle States" data={lifecycle} onSelect={() => undefined} />
        </div>

        <div style={{ height: 16 }} />

        <div className="card cardGlass">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Unggahan Terbaru</h2>
            {loading ? <span style={{ color: 'var(--muted)' }}>Memuat…</span> : null}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Nama File</th>
                <th>Pengunggah</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((it) => (
                <tr key={it._id}>
                  <td>{it.originalName}</td>
                  <td>{it.uploadedBy?.name}</td>
                  <td>{new Date(it.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--muted)' }}>
                    Belum ada unggahan
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
