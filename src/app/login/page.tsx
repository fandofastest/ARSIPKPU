'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

export default function LoginPage() {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => nip.trim().length > 0 && password.length > 0, [nip, password]);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null) as
      | 'light'
      | 'dark'
      | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: 'light' | 'dark' = saved ?? (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nip, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login gagal');
      const profileComplete = Boolean(data?.data?.profileComplete);
      window.location.href = profileComplete ? '/dashboard' : '/settings/profile?required=1';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NIP atau password salah.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loginSpin { 100% { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); }
        
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background decorations */
        .login-bg-shape-1 {
          position: absolute;
          top: -20%; left: -10%;
          width: 60%; height: 60%;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 70%);
          z-index: 0;
        }
        .login-bg-shape-2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 50%; height: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 70%);
          z-index: 0;
        }
        .login-dot-grid {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(color-mix(in srgb, var(--text) 7%, transparent) 1px, transparent 1px);
          background-size: 24px 24px;
          z-index: 0;
        }

        .login-header {
          position: absolute;
          top: 0; left: 0; width: 100%;
          display: flex; align-items: center; gap: 12px;
          padding: 24px 48px;
          z-index: 10;
        }

        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 8%;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
        }

        .login-left {
          flex: 1;
          padding-right: 48px;
        }

        .login-right {
          width: 440px;
          flex-shrink: 0;
        }

        .login-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow);
          padding: 48px 40px;
          position: relative;
        }

        .input-group {
          display: flex;
          align-items: center;
          border: 1px solid var(--inputBorder);
          border-radius: 8px;
          background: var(--inputBg);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-group:focus-within {
          border-color: transparent;
          box-shadow: var(--ring);
        }

        .input-icon {
          padding: 0 12px;
          color: color-mix(in srgb, var(--muted) 90%, transparent);
          display: flex;
        }

        .input-field {
          flex: 1;
          border: none;
          padding: 14px 0;
          outline: none;
          font-size: 0.95rem;
          color: var(--text);
          background: transparent;
        }
        
        .input-field::placeholder {
          color: color-mix(in srgb, var(--muted) 85%, transparent);
        }

        .btn-primary {
          width: 100%;
          background: var(--primary);
          color: var(--primaryText);
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          filter: brightness(0.96);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-sso {
          width: 100%;
          background: var(--panel);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: background 0.2s;
        }

        .btn-sso:hover {
          background: color-mix(in srgb, var(--secondary) 75%, transparent);
        }

        .login-footer {
          position: absolute;
          bottom: 24px;
          width: 100%;
          text-align: center;
          color: var(--muted);
          font-size: 0.85rem;
          z-index: 10;
        }

        @media (max-width: 992px) {
          .login-main {
            flex-direction: column;
            justify-content: center;
            padding: 80px 24px;
          }
          .login-left {
            padding-right: 0;
            margin-bottom: 48px;
            text-align: center;
          }
          .login-left p {
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 480px) {
          .login-right {
            width: 100%;
          }
          .login-card {
            padding: 32px 24px;
          }
          .login-header {
            padding: 16px 24px;
          }
        }
      `}} />

      <div className="login-wrapper">
        <div className="login-bg-shape-1" />
        <div className="login-bg-shape-2" />
        <div className="login-dot-grid" />

        {/* Header */}
        <header className="login-header">
          <Image src="/logo.png" alt="Logo KPU" width={48} height={48} priority />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
              KOMISI PEMILIHAN UMUM
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Kota Dumai
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="login-main">
          {/* Left Text */}
          <div className="login-left">
            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Sistem Arsip Digital
            </h1>
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, color: 'var(--primary)', margin: '0 0 24px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              KPU
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--muted)', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
              Kelola Arsip dan Dokumen Pemilu<br />
              Secara Aman dan Terintegrasi
            </p>
          </div>

          {/* Right Card */}
          <div className="login-right">
            <div className="login-card">
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Image src="/logo.png" alt="Logo KPU" width={72} height={72} priority style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
                  Selamat Datang
                </h2>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>
                  Silakan masuk untuk melanjutkan
                </p>
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Error Alert */}
                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, var(--panel))', border: '1px solid color-mix(in srgb, var(--danger) 35%, var(--border))', borderRadius: 8, padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                  </div>
                )}

                {/* NIP Input */}
                <div className="input-group">
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="NIP / Username"
                    autoComplete="username"
                  />
                </div>

                {/* Password Input */}
                <div className="input-group">
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'none', border: 'none', padding: '0 12px', color: '#a0aec0', cursor: 'pointer', display: 'flex' }}>
                    {showPass ? (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                {/* Additional Options */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: 4, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--muted)' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--primary)', width: 16, height: 16, cursor: 'pointer' }} />
                    Ingat Saya
                  </label>
                </div>

                {/* Login Button */}
                <button className="btn-primary" disabled={!canSubmit || loading} type="submit">
                  {loading ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'loginSpin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Login
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          © 2026 Komisi Pemilihan Umum Kota Dumai
        </footer>
      </div>
    </>
  );
}
