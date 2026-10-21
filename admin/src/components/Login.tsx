'use client';

import { useState } from 'react';
import EyeIcon from './EyeIcon';

interface LoginProps {
  /** Rejects with a message on bad credentials. */
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!username.trim() || !password) {
      setErr('Enter your username and password.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onLogin(username.trim(), password);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--deep)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: '36px 32px',
          maxWidth: 430,
          width: '100%',
        }}
      >
        <h1 style={{ fontSize: 21, marginBottom: 6 }}>DESSS Internal Portal</h1>
        <p className="sub">Zoho CRM Plus implementation · team access only.</p>

        <label className="f">Username</label>
        <input
          type="text"
          value={username}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />

        <label className="f">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            title={showPw ? 'Hide password' : 'Show password'}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 6,
            }}
          >
            <EyeIcon off={showPw} />
          </button>
        </div>

        <div
          style={{
            color: 'var(--clay)',
            fontSize: 13,
            marginTop: 10,
            minHeight: 18,
            fontWeight: 600,
          }}
        >
          {err}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={go}
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="meta-line" style={{ marginTop: 14, textAlign: 'center' }}>
          Your role is set on your account — there is nothing to choose here.
        </p>
      </div>
    </div>
  );
}
