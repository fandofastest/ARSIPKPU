'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FeedbackWidget } from './FeedbackWidget';
import {
  LayoutDashboard,
  Archive,
  BookOpen,
  Settings,
  Users,
  Activity,
  Upload,
  ChevronDown,
  ChevronRight,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  FolderTree,
  Cloud,
  FileText,
  Database,
  Command,
  Menu,
  X,
  TrendingUp,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type MeResponse =
  | { success: true; data: { name: string; phone: string; role: string; profileComplete?: boolean } }
  | { error: string };

function NavItem({
  href,
  label,
  active,
  icon,
  badge,
  isCollapsed
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  badge?: string | number;
  isCollapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
        active
          ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
      } ${isCollapsed ? 'justify-center px-2' : ''}`}
    >
      <span className={`transition-transform duration-150 group-hover:scale-110 ${active ? 'text-white' : ''}`}>
        {icon}
      </span>
      {!isCollapsed && <span className="truncate flex-1">{label}</span>}
      {!isCollapsed && badge !== undefined && (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
          active ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavGroupSettings({ pathname, role, isCollapsed }: { pathname: string; role?: string; isCollapsed?: boolean }) {
  const isAdmin = role === 'admin';
  const isActive = pathname.startsWith('/settings') || pathname.startsWith('/docs');
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div className="space-y-1">
      <div
        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
          isActive
            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
      >
        <Link href="/settings" className="flex items-center gap-3 flex-1 truncate">
          <Settings className={`w-4 h-4 ${isActive ? 'text-red-600 dark:text-red-400' : ''}`} />
          {!isCollapsed && <span className="truncate">Pengaturan</span>}
        </Link>
        {!isCollapsed && (
          <button
            onClick={() => setOpen(!open)}
            type="button"
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && !isCollapsed && (
        <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-1 mt-1">
          <Link
            href="/settings/profile"
            className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/settings/profile'
                ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Profil Saya
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/settings/categories"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/settings/categories'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Kategori Arsip
              </Link>
              <Link
                href="/settings/upload"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/settings/upload'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Aturan Upload
              </Link>
              <Link
                href="/settings/integrations"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/settings/integrations'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Integrasi Cloud
              </Link>
              <Link
                href="/docs/integrations"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/docs/integrations'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Dokumentasi API
              </Link>
              <Link
                href="/settings/ocr-logs"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/settings/ocr-logs'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Log Worker OCR
              </Link>
              <Link
                href="/settings/backup"
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/settings/backup'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Backup & Restore
              </Link>
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  const topQueryRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null) as
      | 'light'
      | 'dark'
      | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: 'light' | 'dark' = saved ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    if (initial === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  // Handle Ctrl + K shortcut
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [accountMenuOpen]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.localStorage.setItem('theme', next);
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
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
    setSpotlightOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#131c2e] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Logo KPU" width={26} height={26} priority />
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">KPU Smart Archive</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen bg-white dark:bg-[#131c2e] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 shadow-sm ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Logo & Title */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="Logo KPU" width={24} height={24} priority />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-100 tracking-tight">
                  KPU Smart Archive
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  KPU Kota Dumai
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          <NavItem
            href="/dashboard"
            label="Beranda"
            active={pathname === '/dashboard'}
            icon={<LayoutDashboard className="w-4.5 h-4.5" />}
            isCollapsed={isCollapsed}
          />
          {me?.role === 'admin' && (
            <NavItem
              href="/monev"
              label="Monev Arsip"
              active={pathname === '/monev'}
              icon={<TrendingUp className="w-4.5 h-4.5" />}
              isCollapsed={isCollapsed}
            />
          )}
          <NavItem
            href="/files"
            label="Arsip Dokumen"
            active={pathname === '/files'}
            icon={<Archive className="w-4.5 h-4.5" />}
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/guide"
            label="Panduan"
            active={pathname === '/guide'}
            icon={<BookOpen className="w-4.5 h-4.5" />}
            isCollapsed={isCollapsed}
          />
          <NavGroupSettings pathname={pathname} role={me?.role} isCollapsed={isCollapsed} />

          {me?.role === 'admin' && (
            <div className="pt-2">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  Administrator
                </div>
              )}
              <NavItem
                href="/users"
                label="Pengguna"
                active={pathname === '/users'}
                icon={<Users className="w-4.5 h-4.5" />}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/audit"
                label="Log Aktivitas"
                active={pathname === '/audit'}
                icon={<Activity className="w-4.5 h-4.5" />}
                isCollapsed={isCollapsed}
              />
            </div>
          )}
        </div>

        {/* Sidebar Footer / Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-full items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {!isCollapsed && <span>{isCollapsed ? 'Sembunyikan' : 'Ringkaskan Menu'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#131c2e]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Quick Search trigger */}
          <div className="flex-1 max-w-xl">
            <div
              onClick={() => setSpotlightOpen(true)}
              className="group relative flex items-center w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-medium cursor-pointer hover:border-red-300 dark:hover:border-red-900/60 hover:bg-white dark:hover:bg-slate-800 transition-all duration-150 shadow-sm"
            >
              <Search className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-red-600 transition-colors" />
              <span className="truncate flex-1">Cari arsip (nama file, nomor surat, isi OCR)…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </div>
          </div>

          {/* Action Buttons & Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Quick Upload Button */}
            <Link
              href="/upload"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all duration-150"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Arsip</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              title={theme === 'dark' ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
            </button>

            {/* User Account Dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {me?.name ? me.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline-block font-semibold text-xs text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                  {me?.name || 'Pengguna'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{me?.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{me?.phone}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md uppercase bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60">
                      {me?.role || 'user'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      router.push('/settings/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profil Pengguna</span>
                  </button>

                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      toggleTheme();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                    <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      void logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Keluar Sistem</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Floating Spotlight Search Dialog (Ctrl + K) */}
      {spotlightOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-5 h-5 text-red-600 mr-3" />
              <input
                autoFocus
                value={topQuery}
                onChange={(e) => setTopQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitTopSearch();
                  if (e.key === 'Escape') setSpotlightOpen(false);
                }}
                placeholder="Pencarian cepat arsip, nomor keputusan, atau isi OCR..."
                className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                onClick={() => setSpotlightOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-3 text-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pintasan Navigasi
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    router.push('/files');
                    setSpotlightOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-left"
                >
                  <Archive className="w-4 h-4 text-red-600" />
                  <div>
                    <div className="font-semibold">Semua Arsip</div>
                    <div className="text-[10px] text-slate-400">Daftar & pencarian file</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    router.push('/upload');
                    setSpotlightOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-semibold">Upload Dokumen</div>
                    <div className="text-[10px] text-slate-400">Tambah arsip baru</div>
                  </div>
                </button>
              </div>

              {topQuery.trim() && (
                <div className="pt-2">
                  <button
                    onClick={submitTopSearch}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-red-600 text-white font-medium text-xs hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
                  >
                    <span>Cari kata kunci &quot;{topQuery}&quot; di database arsip</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border">ESC</kbd> untuk keluar</span>
              <span>KPU Digital Archive v1.0</span>
            </div>
          </div>
        </div>
      )}

      <FeedbackWidget />
    </div>
  );
}
