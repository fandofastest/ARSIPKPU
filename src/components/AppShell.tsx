'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FeedbackWidget } from './FeedbackWidget';

type MeResponse =
  | { success: true; data: { name: string; phone: string; role: string; profileComplete?: boolean } }
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

function IconGuide({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

function NavGroupSettings({ pathname, role }: { pathname: string; role?: string }) {
  const isAdmin = role === 'admin';
  const isActive = pathname.startsWith('/settings') || pathname.startsWith('/docs');
  const [open, setOpen] = useState(isActive);

  return (
    <div className="navGroup">
      <div className={`navItem navItemSplit ${isActive ? 'navItemActive' : ''}`}>
        <Link href="/settings" className="navItemLinkPart">
          <IconSettings />
          <span>Pengaturan</span>
        </Link>
        <button
          className={`navItemToggle ${open ? 'navItemToggleOpen' : ''}`}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="navSubmenu">
          <Link href="/settings/profile" className={`navSubItem ${pathname === '/settings/profile' ? 'navSubItemActive' : ''}`}>Profil</Link>
          {isAdmin && (
            <>
              <Link href="/settings/categories" className={`navSubItem ${pathname === '/settings/categories' ? 'navSubItemActive' : ''}`}>Kategori Arsip</Link>
              <Link href="/settings/upload" className={`navSubItem ${pathname === '/settings/upload' ? 'navSubItemActive' : ''}`}>Upload</Link>
              <Link href="/settings/integrations" className={`navSubItem ${pathname === '/settings/integrations' ? 'navSubItemActive' : ''}`}>Integrasi Cloud</Link>
              <Link href="/docs/integrations" className={`navSubItem ${pathname === '/docs/integrations' ? 'navSubItemActive' : ''}`}>Docs API Integrasi</Link>
              <Link href="/settings/ocr-logs" className={`navSubItem ${pathname === '/settings/ocr-logs' ? 'navSubItemActive' : ''}`}>Log OCR</Link>
              <Link href="/settings/backup" className={`navSubItem ${pathname === '/settings/backup' ? 'navSubItemActive' : ''}`}>Backup & Restore</Link>
            </>
          )}
        </div>
      )}
    </div>
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
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return r.json() as Promise<MeResponse>;
      })
      .then((d) => {
        if (!d) return;
        if ('success' in d) {
          setMe(d.data);
          if (d.data.profileComplete === false && pathname !== '/settings/profile') {
            router.replace('/settings/profile?required=1');
          }
        } else if ('error' in d && (d.error === 'Unauthorized' || d.error === 'UNAUTHORIZED')) {
          window.location.href = '/login';
        }
      })
      .catch(() => {
        // ignore
      });
  }, [pathname, router]);


  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      
      // Aggressively clear client-side state
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      localStorage.removeItem('theme'); // keep theme if we want, but let's be safe. Actually, better to just clear auth specific stuff if any, but let's clear all.
      sessionStorage.clear();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '28px', height: 'auto', flexShrink: 0 }} />
            <div>
              <div className="sidebarBrandTitle">KPU Smart Archive</div>
              <div className="sidebarBrandSub">Sistem arsip pintar dengan pencarian cepat dan klasifikasi otomatis.</div>
            </div>
          </div>
        </div>

        <div className="nav">
          <NavItem href="/dashboard" label="Beranda" active={pathname === '/dashboard'} icon={<IconDashboard />} />
          {me?.role === 'admin' && (
            <NavItem href="/monev" label="Monev" active={pathname === '/monev'} icon={<IconDashboard />} />
          )}
          <NavItem href="/files" label="Arsip" active={pathname === '/files'} icon={<IconArchive />} />
          <NavItem href="/guide" label="Panduan" active={pathname === '/guide'} icon={<IconGuide />} />
          <NavGroupSettings pathname={pathname} role={me?.role} />
          {me?.role === 'admin' && (
            <>
              <NavItem href="/users" label="Pengguna" active={pathname === '/users'} icon={<IconUsers />} />
              <NavItem href="/audit" label="Aktivitas" active={pathname === '/audit'} icon={<IconAudit />} />
            </>
          )}
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
