'use client';

import { useMemo, useState } from 'react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => phone.trim().length > 0 && password.length > 0, [phone, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Login</h1>
      <div className="card">
        <form onSubmit={onSubmit} className="row" style={{ flexDirection: 'column' }}>
          <label>
            Phone
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
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
