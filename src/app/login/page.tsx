'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || 'Incorrect password.');
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      // Full navigation so the proxy re-evaluates with the fresh cookie.
      window.location.assign(next.startsWith('/') ? next : '/');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <form onSubmit={submit} className="card" style={{ width: 'min(400px, 100%)', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--gold)' }} />
          <span className="gold-text" style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
            WealthPulse
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px' }}>
          Enter the demo password to continue.
        </p>

        <label className="label" htmlFor="pw">Password</label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%', marginTop: 6, marginBottom: 16, padding: '11px 13px',
            borderRadius: 11, background: 'var(--panel-2)', color: 'var(--text)',
            border: '1px solid var(--border-strong)', fontSize: 14, outline: 'none',
          }}
        />

        {err && (
          <div style={{ color: 'var(--neg)', fontSize: 13, marginBottom: 14 }}>{err}</div>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 11, border: 'none',
            cursor: busy ? 'default' : 'pointer', fontWeight: 650, fontSize: 14, color: '#1a1206',
            background: 'linear-gradient(135deg, #f0d692, #d8b25a 55%, #b88a30)',
            opacity: busy || !password ? 0.6 : 1,
          }}
        >
          {busy ? 'Signing in…' : 'Enter demo'}
        </button>
      </form>
    </div>
  );
}
