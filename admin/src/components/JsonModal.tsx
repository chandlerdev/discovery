'use client';

import { useEffect, useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

interface JsonModalProps {
  title: string;
  /** Any JSON-serializable value — pretty-printed for reading. */
  data: unknown;
  onClose: () => void;
}

export default function JsonModal({ title, data, onClose }: JsonModalProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  // Esc closes, and the page behind must not scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function copy() {
    const ok = await copyToClipboard(json);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose} // click the backdrop to dismiss
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(16,36,26,.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // ...but not when clicking inside it
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--mist)',
          width: 'min(900px, 100%)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--mist)',
          }}
        >
          <h2 style={{ flex: 1, fontSize: 18 }}>{title}</h2>
          <button className="btn btn-ghost" style={{ padding: '7px 14px' }} onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '7px 14px' }}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <pre
          style={{
            margin: 0,
            padding: '18px 20px',
            overflow: 'auto',
            flex: 1,
            fontFamily: "'JetBrains Mono','Consolas',monospace",
            fontSize: 12.5,
            lineHeight: 1.6,
            background: '#FDFEFB',
            color: 'var(--ink)',
            whiteSpace: 'pre',
          }}
        >
          {json}
        </pre>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--mist)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span className="meta-line" style={{ flex: 1 }}>
            {json.split('\n').length} lines · {(json.length / 1024).toFixed(1)} KB
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
