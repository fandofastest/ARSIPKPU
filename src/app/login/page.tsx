'use client';

import { useMemo, useState } from 'react';

export default function LoginPage() {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
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
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      const profileComplete = Boolean(data?.data?.profileComplete);
      window.location.href = profileComplete ? '/dashboard' : '/settings/profile?required=1';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginSplitLayout">
      {/* Left Column - Illustration */}
      <div className="loginIllustration">
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/illustration.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '48px',
          color: 'white',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1
          }} />
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
            <h1 style={{ color: 'white', marginBottom: '12px', fontSize: '3rem', fontWeight: 900, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>E-Arsip KPU</h1>
            <p style={{ fontSize: '1.3rem', opacity: 0.95, textShadow: '0 2px 8px rgba(0,0,0,0.5)', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              Sistem Informasi Pengelolaan Arsip Dinamis
              <br/>
              Komisi Pemilihan Umum Kota Dumai
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="loginFormArea">
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img src="/logo.png" alt="Logo KPU" style={{ width: 100, marginBottom: 24, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))' }} />
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Selamat Datang</h2>
            <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: '1.05rem' }}>Silakan masuk untuk mengakses sistem</p>
          </div>
          
          <div className="card" style={{ padding: '36px', border: '1px solid color-mix(in srgb, var(--primary) 15%, var(--border))', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08), 0 0 0 1px color-mix(in srgb, var(--primary) 5%, transparent)' }}>
            <form onSubmit={onSubmit} className="row" style={{ flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 650, fontSize: '0.95rem', color: 'var(--text)' }}>NIP / Username</label>
                <input 
                  className="input" 
                  value={nip} 
                  onChange={(e) => setNip(e.target.value)} 
                  placeholder="Masukkan NIP" 
                  style={{ padding: '14px 16px', fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 650, fontSize: '0.95rem', color: 'var(--text)' }}>Password</label>
                <input 
                  className="input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  type="password" 
                  placeholder="••••••••"
                  style={{ padding: '14px 16px', fontSize: '1rem' }}
                />
              </div>
              {error ? (
                <div style={{ 
                  color: 'var(--danger)', 
                  backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  {error}
                </div>
              ) : null}
              <button 
                className="btn" 
                disabled={!canSubmit || loading} 
                type="submit"
                style={{ marginTop: '12px', padding: '16px', fontSize: '1.05rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                    Memproses...
                  </>
                ) : 'Masuk ke Sistem'}
              </button>
            </form>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            &copy; {new Date().getFullYear()} Komisi Pemilihan Umum Kota Dumai.<br/>All rights reserved.
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
