'use client';

import { useMemo, useState } from 'react';

export default function LoginPage() {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => nip.trim().length > 0 && password.length > 0, [nip, password]);

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
        html, body { margin: 0; padding: 0; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; background: #f0f4f8; }
        
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
          background: radial-gradient(circle, rgba(220, 38, 38, 0.05) 0%, transparent 70%);
          z-index: 0;
        }
        .login-bg-shape-2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 50%; height: 50%;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.05) 0%, transparent 70%);
          z-index: 0;
        }
        .login-dot-grid {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
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
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          padding: 48px 40px;
          position: relative;
        }

        .input-group {
          display: flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-group:focus-within {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .input-icon {
          padding: 0 12px;
          color: #a0aec0;
          display: flex;
        }

        .input-field {
          flex: 1;
          border: none;
          padding: 14px 0;
          outline: none;
          font-size: 0.95rem;
          color: #2d3748;
          background: transparent;
        }
        
        .input-field::placeholder {
          color: #a0aec0;
        }

        .btn-primary {
          width: 100%;
          background: #dc2626;
          color: #ffffff;
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
          background: #b91c1c;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-sso {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #4a5568;
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
          background: #f7fafc;
        }

        .login-footer {
          position: absolute;
          bottom: 24px;
          width: 100%;
          text-align: center;
          color: #a0aec0;
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
          <img src="/logo.png" alt="Logo KPU" style={{ width: 48, height: 'auto' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1a202c', letterSpacing: '-0.01em' }}>
              KOMISI PEMILIHAN UMUM
            </div>
            <div style={{ fontSize: '0.8rem', color: '#718096' }}>
              Kota Dumai
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="login-main">
          {/* Left Text */}
          <div className="login-left">
            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, color: '#1a202c', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Sistem Arsip Digital
            </h1>
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, color: '#dc2626', margin: '0 0 24px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              KPU
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#4a5568', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
              Kelola Arsip dan Dokumen Pemilu<br />
              Secara Aman dan Terintegrasi
            </p>
          </div>

          {/* Right Card */}
          <div className="login-right">
            <div className="login-card">
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <img src="/logo.png" alt="Logo KPU" style={{ width: 72, height: 'auto', marginBottom: 16 }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a202c', margin: '0 0 8px' }}>
                  Selamat Datang
                </h2>
                <p style={{ color: '#718096', margin: 0, fontSize: '0.95rem' }}>
                  Silakan masuk untuk melanjutkan
                </p>
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Error Alert */}
                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c53030', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#4a5568' }}>
                    <input type="checkbox" style={{ accentColor: '#dc2626', width: 16, height: 16, cursor: 'pointer' }} />
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
