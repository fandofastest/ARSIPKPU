'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FeedbackWidget } from './FeedbackWidget';

type MeResponse =
  | { success: true; data: { name: string; phone: string; role: string } }
  | { error: string };

type IconProps = { className?: string };

function IconDashboard({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 13.5a1.5 1.5 0 0 0 1.5 1.5H11V5.5A1.5 1.5 0 0 0 9.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M13 19.5a1.5 1.5 0 0 0 1.5 1.5h4A1.5 1.5 0 0 0 20 19.5v-8A1.5 1.5 0 0 0 18.5 10H13v9.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M13 8h5.5A1.5 1.5 0 0 0 20 6.5v-1A1.5 1.5 0 0 0 18.5 4H13v4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M4 18.5A1.5 1.5 0 0 0 5.5 20H11v-3H5.5A1.5 1.5 0 0 0 4 18.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconAudit({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path d="M8 8h8v2H8V8Z" fill="currentColor" opacity="0.9" />
      <path d="M8 12h8v2H8v-2Z" fill="currentColor" opacity="0.9" />
      <path d="M8 16h5v2H8v-2Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M19.4 13a7.5 7.5 0 0 0 .1-1l2-1.2-2-3.5-2.3.6a7.3 7.3 0 0 0-1.7-1l-.3-2.4H11l-.3 2.4a7.3 7.3 0 0 0-1.7 1l-2.3-.6-2 3.5 2 1.2a7.5 7.5 0 0 0 0 2l-2 1.2 2 3.5 2.3-.6a7.3 7.3 0 0 0 1.7 1l.3 2.4h4l.3-2.4a7.3 7.3 0 0 0 1.7-1l2.3.6 2-3.5-2-1.2Z"
        fill="currentColor"
        opacity="0.2"
      />
    </svg>
  );
}

function IconUpload({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3l4 4h-3v7h-2V7H8l4-4Z" fill="currentColor" opacity="0.9" />
      <path
        d="M5 14a2 2 0 0 1 2-2h1v2H7v5h10v-5h-1v-2h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconArchive({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path d="M9 14h6v2H9v-2Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M3.5 19a5 5 0 0 1 10 0v1h-10v-1Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M14.5 20v-1a4.2 4.2 0 0 0-1.2-3 4.5 4.5 0 0 1 7.2 3v1h-6Z"
        fill="currentColor"
        opacity="0.15"
      />
    </svg>
  );
}

function NavItem({
  href,
  label,
  active,
  icon
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={active ? 'navItem navItemActive' : 'navItem'}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; phone: string; role: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [topQuery, setTopQuery] = useState('');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null) as
      | 'light'
      | 'dark'
      | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: 'light' | 'dark' = saved ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json() as Promise<MeResponse>)
      .then((d) => {
        if ('success' in d) setMe(d.data);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  }

  function submitTopSearch() {
    const q = topQuery.trim();
    if (!q) return;
    const sp = new URLSearchParams();
    sp.set('q', q);
    sp.set('page', '1');
    sp.set('limit', '20');
    router.push(`/files?${sp.toString()}`);
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarBrand">
          <div className="sidebarBrandTitle">KPU Dumai</div>
          <div className="sidebarBrandSub">Modern Admin Dashboard</div>
        </div>

        <div className="nav">
          <NavItem href="/dashboard" label="Beranda" active={pathname === '/dashboard'} icon={<IconDashboard />} />
          <NavItem href="/monev" label="Monev" active={pathname === '/monev'} icon={<IconDashboard />} />
          <NavItem href="/files" label="Arsip" active={pathname === '/files'} icon={<IconArchive />} />
          <NavItem href="/settings" label="Pengaturan" active={pathname === '/settings'} icon={<IconSettings />} />
          {me?.role === 'admin' ? (
            <>
              <NavItem href="/users" label="Pengguna" active={pathname === '/users'} icon={<IconUsers />} />
              <NavItem href="/audit" label="Aktivitas" active={pathname === '/audit'} icon={<IconAudit />} />
            </>
          ) : null}
        </div>
      </aside>

      <div className="pageWrap">
        <header className="topbar">
          <div className="searchWrap">
            <input
              className="input"
              value={topQuery}
              onChange={(e) => setTopQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitTopSearch();
              }}
              placeholder="Cari arsip (nama file, nomor surat, isi dokumen)…"
            />
          </div>

          <div className="topbarRight">
            <button className="btn btnSecondary" type="button" onClick={toggleTheme}>
              {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            </button>
            <div style={{ color: 'var(--muted)' }}>{me ? `Halo, ${me.name}` : ''}</div>
            <button className="btn btnSecondary" type="button" onClick={logout}>
              Keluar
            </button>
          </div>
        </header>

        <div style={{ padding: 16 }}>{children}</div>
      </div>
      <FeedbackWidget />
    </div>
  );
}
