'use client';

import { useState } from 'react';
import EyeIcon from './EyeIcon';

interface UnlockModalProps {
  /** Called with the company name and password; must reject with a message on bad credentials. */
  onUnlock: (company: string, password: string) => Promise<void>;
}

/**
 * The gate in front of a client's questionnaire. It has no cancel and no backdrop
 * dismiss — the only way past it is correct credentials. A failed attempt leaves the
 * dialog open with the error shown.
 */
export default function UnlockModal({ onUnlock }: UnlockModalProps) {
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!company.trim() || !password) {
      setErr('Enter your company name and password.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onUnlock(company.trim(), password);
      // On success the parent unmounts this modal — nothing to do here.
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Incorrect company name or password');
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          border: '1px solid var(--mist)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: 'var(--leaf)',
            color: 'var(--lime)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 14,
          }}
        >
          🔒
        </div>

        <h1 id="unlock-title" style={{ fontSize: 21, marginBottom: 6, color: 'var(--leaf)' }}>
          Unlock your questionnaire
        </h1>
        <p className="sub">
          Enter your company name and the password DESSS sent you to open your discovery
          questionnaire.
        </p>

        <label className="f">Company name</label>
        <input
          type="text"
          value={company}
          autoFocus
          autoComplete="organization"
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        <label className="f">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
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
          role="alert"
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
          onClick={submit}
          disabled={busy}
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
