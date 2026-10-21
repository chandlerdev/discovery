'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  FONT_OPTIONS,
  loadTheme,
  saveTheme,
  THEME_TOKENS,
  type ThemeSettings,
  type ThemeToken,
} from '@/lib/theme';

interface SettingsModalProps {
  onClose: () => void;
  /** Opens the Admin Users screen (handled by the parent so it can remember where to return). */
  onAdminUsers: () => void;
  say: (msg: string) => void;
}

const GROUPS: ThemeToken['group'][] = ['Colors', 'Typography', 'Shape'];

/** Website appearance settings — colours, fonts and shape, applied live and saved locally. */
export default function SettingsModal({ onClose, onAdminUsers, say }: SettingsModalProps) {
  const [theme, setTheme] = useState<ThemeSettings>(() => loadTheme());

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const grouped = useMemo(
    () => GROUPS.map((g) => ({ group: g, tokens: THEME_TOKENS.filter((t) => t.group === g) })),
    [],
  );

  /** Live preview: apply on every change so the whole app updates as you tweak. */
  function set(cssVar: string, value: string) {
    const next = { ...theme, [cssVar]: value };
    setTheme(next);
    applyTheme(next);
  }

  function save() {
    applyTheme(theme);
    saveTheme(theme);
    say('Appearance saved');
    onClose();
  }

  /** Revert live edits to what was last saved, then close. */
  function cancel() {
    const saved = loadTheme();
    applyTheme(saved);
    onClose();
  }

  /**
   * Opens the Admin Users screen. Drops any unsaved live theme edits first, then hands off
   * to the parent, which remembers the tab + that settings was open so Back restores both.
   */
  function goToAdminUsers() {
    applyTheme(loadTheme()); // revert unsaved live preview to the saved theme
    onAdminUsers();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Website settings"
      onClick={cancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(16,36,26,.55)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          height: '100%',
          background: 'var(--card)',
          borderLeft: '1px solid var(--mist)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 30px rgba(16,36,26,.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px 22px',
            borderBottom: '1px solid var(--mist)',
          }}
        >
          <h2 style={{ flex: 1, fontSize: 19 }}>Website settings</h2>
          <button
            className="btn btn-ghost"
            onClick={cancel}
            aria-label="Close settings"
            title="Close"
            style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <p className="sub">
            Change the portal&rsquo;s colours, fonts and shape. Edits preview instantly; click
            <strong> Save</strong> to keep them on this device.
          </p>

          {grouped.map(({ group, tokens }) => (
            <div key={group} style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '.8px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  margin: '4px 0 12px',
                }}
              >
                {group}
              </div>

              {tokens.map((t) => (
                <div
                  key={t.cssVar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label
                      htmlFor={`set${t.cssVar}`}
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block' }}
                    >
                      {t.label}
                    </label>
                    {t.hint && (
                      <span className="meta-line" style={{ fontSize: 12 }}>
                        {t.hint}
                      </span>
                    )}
                  </div>
                  <Control token={t} value={theme[t.cssVar]} onChange={(v) => set(t.cssVar, v)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '16px 22px',
            borderTop: '1px solid var(--mist)',
          }}
        >
          <button
            type="button"
            onClick={goToAdminUsers}
            title="Open the Admin Users screen"
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--leaf)',
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'underline',
            }}
          >
            Admin users
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={cancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** The right-hand input for one token: swatch+hex for colours, a picker for fonts, px for size. */
function Control({
  token,
  value,
  onChange,
}: {
  token: ThemeToken;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `set${token.cssVar}`;

  if (token.type === 'color') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 40,
            height: 34,
            padding: 2,
            border: '1.5px solid var(--mist)',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${token.label} hex value`}
          style={{ width: 92, fontFamily: "'JetBrains Mono','Consolas',monospace", fontSize: 12.5 }}
        />
      </div>
    );
  }

  if (token.type === 'font') {
    // If the saved value isn't in the list, show it as a first "Custom" option.
    const known = FONT_OPTIONS.some((f) => f.value === value);
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: '0 0 190px', fontFamily: value }}
      >
        {!known && <option value={value}>Custom</option>}
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>
    );
  }

  // size — a plain px number
  const num = parseInt(value, 10) || 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
      <input
        id={id}
        type="number"
        min={0}
        max={28}
        value={num}
        onChange={(e) => onChange(`${e.target.value}px`)}
        style={{ width: 72 }}
      />
      <span className="meta-line">px</span>
    </div>
  );
}
