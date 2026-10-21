'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Option {
  value: string;
  label: string;
  /** Optional second line shown under the label (e.g. the client id). */
  hint?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Width of the trigger button. */
  width?: number | string;
}

/**
 * A native <select> can't filter its options. This is a lightweight combobox: a trigger
 * that opens a panel with a search box and a filtered list. No external dependency.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  width = 240,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Focus the search box and clear the last query whenever the panel opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      inputRef.current?.focus();
    }
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', width, display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          border: '1.5px solid var(--mist)',
          borderRadius: 10,
          background: '#FDFEFB',
          padding: '9px 12px',
          font: 'inherit',
          fontSize: 14,
          color: selected ? 'var(--ink)' : 'var(--muted)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#fff',
            border: '1px solid var(--mist)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(16,36,26,.14)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--mist)' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ padding: '8px 10px', fontSize: 13.5 }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div className="meta-line" style={{ padding: '12px 14px' }}>
                No matches
              </div>
            )}
            {filtered.map((o) => {
              const on = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: on ? '#F1FAEA' : 'transparent',
                    padding: '9px 14px',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: 14,
                    color: 'var(--ink)',
                    borderLeft: on ? '3px solid var(--sprout)' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = '#F7FBF3';
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: on ? 700 : 500 }}>{o.label}</div>
                  {o.hint && <div className="meta-line">{o.hint}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
