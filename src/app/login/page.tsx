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
    <div className="container" style={{ maxWidth: 440, marginTop: '8vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo.png" alt="Logo KPU" style={{ width: 100, marginBottom: 16 }} />
        <h1 style={{ margin: 0 }}>E-Arsip KPU</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>KOTA DUMAI</p>
      </div>
      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>Silakan Masuk</h2>
        <form onSubmit={onSubmit} className="row" style={{ flexDirection: 'column' }}>
          <label>
            NIP
            <input className="input" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Masukkan NIP" />
          </label>
          <label>
            Password
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
          <button className="btn" disabled={!canSubmit || loading} type="submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
