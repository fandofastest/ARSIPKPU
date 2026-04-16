'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type MeResponse =
  | { success: true; data: { name: string; phone: string; role: string } }
  | { error: string };

export function NavBar() {
  const [me, setMe] = useState<{ name: string; phone: string; role: string } | null>(null);

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

  return (
    <div style={{ borderBottom: '1px solid #1f2937' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/dashboard">
            <b>Archive</b>
          </Link>
          <Link href="/upload">Upload</Link>
          <Link href="/archive">Browse</Link>
          {me?.role === 'admin' ? <Link href="/users">Users</Link> : null}
        </div>
        <div style={{ color: '#9ca3af' }}>{me ? `${me.name} (${me.role})` : ''}</div>
      </div>
    </div>
  );
}
