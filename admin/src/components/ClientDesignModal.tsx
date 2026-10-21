'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  DEFAULT_THEME,
  FONT_OPTIONS,
  THEME_TOKENS,
  type ThemeSettings,
  type ThemeToken,
} from '@/lib/theme';

interface ClientDesignModalProps {
  cid: string;
  company: string;
  /** The client's uploaded logo (from creation) — pre-fills the header logo if unset. */
  logo?: string;
  token: string;
  onClose: () => void;
  say: (msg: string) => void;
}

const GROUPS: ThemeToken['group'][] = ['Colors', 'Typography', 'Shape'];

/**
 * Per-client design editor. Loads the selected client's saved theme, lets an admin edit
 * colours/fonts/shape with a live preview of the client's page, and saves it to the
 * server so that client's link renders in this design for everyone.
 */
export default function ClientDesignModal({
  cid,
  company,
  logo,
  token,
  onClose,
  say,
}: ClientDesignModalProps) {
  const [theme, setTheme] = useState<ThemeSettings>({ ...DEFAULT_THEME });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await api.getClientTheme(cid).catch(() => null);
      setTheme({ ...DEFAULT_THEME, ...(saved || {}) });
      setLoading(false);
    })();
  }, [cid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const grouped = useMemo(
    () => GROUPS.map((g) => ({ group: g, tokens: THEME_TOKENS.filter((t) => t.group === g) })),
    [],
  );

  function set(cssVar: string, value: string) {
    setTheme((prev) => ({ ...prev, [cssVar]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveClientTheme(cid, theme, token);
      say(`Design saved for ${company}`);
      onClose();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not save the design');
    } finally {
      setSaving(false);
    }
  }

  // Inline CSS variables that scope the preview to this theme without touching the admin UI.
  const previewVars = Object.fromEntries(
    THEME_TOKENS.map((t) => [t.cssVar, theme[t.cssVar] ?? t.default]),
  ) as React.CSSProperties;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Design for ${company}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(16,36,26,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(940px, 100%)',
          maxHeight: '92vh',
          background: 'var(--card)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(16,36,26,.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 22px',
            borderBottom: '1px solid var(--mist)',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 19 }}>Client design</h2>
            <span className="meta-line">
              Editing the look of <strong>{company}</strong>&apos;s questionnaire link
            </span>
          </div>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{ padding: '6px 12px', fontSize: 18, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Controls */}
          <div
            style={{
              flex: '1 1 360px',
              minWidth: 300,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 22px',
              borderRight: '1px solid var(--mist)',
            }}
          >
            {loading ? (
              <p className="meta-line">Loading design…</p>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.8px',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      margin: '2px 0 12px',
                    }}
                  >
                    Layout
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label
                        htmlFor="dtemplate"
                        style={{ fontWeight: 600, fontSize: 13.5, display: 'block' }}
                      >
                        Layout template
                      </label>
                      <span className="meta-line" style={{ fontSize: 12 }}>
                        How this client&apos;s questionnaire is arranged
                      </span>
                    </div>
                    <select
                      id="dtemplate"
                      value={theme['template'] || 'classic'}
                      onChange={(e) => set('template', e.target.value)}
                      style={{ flex: '0 0 190px' }}
                    >
                      <option value="classic">Classic (stacked)</option>
                      <option value="sidebar">Sidebar (section nav)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.8px',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      margin: '2px 0 12px',
                    }}
                  >
                    Header
                  </div>

                  <p className="meta-line" style={{ fontSize: 12, margin: '0 0 12px' }}>
                    The logo uploaded when the client was created is shown automatically in the
                    header.
                  </p>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      htmlFor="dHeaderTitle"
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block', marginBottom: 5 }}
                    >
                      Header title
                    </label>
                    <input
                      id="dHeaderTitle"
                      type="text"
                      value={theme.headerTitle || ''}
                      placeholder="Zoho CRM Plus — Implementation Discovery"
                      onChange={(e) => set('headerTitle', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      htmlFor="dHeaderSub"
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block', marginBottom: 5 }}
                    >
                      Header subtitle
                    </label>
                    <textarea
                      id="dHeaderSub"
                      value={theme.headerSubtitle || ''}
                      placeholder="Review, correct, and complete the questions below…"
                      onChange={(e) => set('headerSubtitle', e.target.value)}
                      style={{ minHeight: 60 }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      htmlFor="dPartnerName"
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block', marginBottom: 5 }}
                    >
                      Partner name
                    </label>
                    <input
                      id="dPartnerName"
                      type="text"
                      value={theme.partnerName || ''}
                      placeholder="DESSS"
                      onChange={(e) => set('partnerName', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      htmlFor="dPartnerTag"
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block', marginBottom: 5 }}
                    >
                      Partner tagline
                    </label>
                    <input
                      id="dPartnerTag"
                      type="text"
                      value={theme.partnerTagline || ''}
                      placeholder="SOLUTION PARTNER"
                      onChange={(e) => set('partnerTagline', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      htmlFor="dHeaderStatus"
                      style={{ fontWeight: 600, fontSize: 13.5, display: 'block', marginBottom: 5 }}
                    >
                      Status text
                    </label>
                    <input
                      id="dHeaderStatus"
                      type="text"
                      value={theme.headerStatus || ''}
                      placeholder="Discovery in progress — please complete the questionnaire"
                      onChange={(e) => set('headerStatus', e.target.value)}
                    />
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13.5, display: 'block' }}>
                        Status dot color
                      </label>
                      <span className="meta-line" style={{ fontSize: 12 }}>
                        The dot next to the status text
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                      <input
                        type="color"
                        value={theme.statusDotColor || '#C6F26E'}
                        onChange={(e) => set('statusDotColor', e.target.value)}
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
                        value={theme.statusDotColor || ''}
                        placeholder="#C6F26E"
                        onChange={(e) => set('statusDotColor', e.target.value)}
                        style={{
                          width: 92,
                          fontFamily: "'JetBrains Mono','Consolas',monospace",
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                  </div>
                </div>
                {grouped.map(({ group, tokens }) => (
                <div key={group} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.8px',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      margin: '2px 0 12px',
                    }}
                  >
                    {group}
                  </div>
                  {tokens.map((t) => (
                    <div
                      key={t.cssVar}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label
                          htmlFor={`d${t.cssVar}`}
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
              </>
            )}
          </div>

          {/* Live preview */}
          <div
            style={{
              flex: '1 1 340px',
              minWidth: 300,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 22px',
              background: 'var(--paper)',
            }}
          >
            <div
              className="meta-line"
              style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}
            >
              Preview
            </div>
            <div style={{ ...previewVars, fontFamily: 'var(--font-body)' }}>
              <ClientPreview
                company={company}
                headerLogo={logo}
                headerTitle={theme.headerTitle}
                partnerName={theme.partnerName}
                headerStatus={theme.headerStatus}
                statusDotColor={theme.statusDotColor}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '14px 22px',
            borderTop: '1px solid var(--mist)',
          }}
        >
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save design'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A miniature of the client's questionnaire page, styled by the scoped CSS variables. */
function ClientPreview({
  company,
  headerLogo,
  headerTitle,
  partnerName,
  headerStatus,
  statusDotColor,
}: {
  company: string;
  headerLogo?: string;
  headerTitle?: string;
  partnerName?: string;
  headerStatus?: string;
  statusDotColor?: string;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--mist)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--card)',
      }}
    >
      <div
        style={{
          background: 'var(--leaf)',
          color: '#F3FAEF',
          padding: '16px 18px',
          borderBottom: '4px solid var(--lime)',
        }}
      >
        <div
          style={{ fontSize: 13, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {headerLogo ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#fff',
                borderRadius: 6,
                padding: '3px 6px',
              }}
            >
              <img
                src={headerLogo}
                alt=""
                style={{ height: 18, maxWidth: 90, objectFit: 'contain', display: 'block' }}
              />
            </span>
          ) : (
            <span>{company}</span>
          )}
          <span>
            · <strong>{partnerName || 'DESSS'}</strong>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginTop: 6 }}>
          {headerTitle || 'Implementation Discovery'}
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 12,
            background: 'rgba(255,255,255,.14)',
            border: '1px solid rgba(255,255,255,.3)',
            padding: '5px 12px',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusDotColor || 'var(--lime)',
            }}
          />
          {headerStatus || 'Discovery in progress'}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
            QUESTIONS ANSWERED
          </span>
          <strong style={{ color: 'var(--leaf)' }}>60%</strong>
        </div>
        <div style={{ height: 10, background: 'var(--mist)', borderRadius: 999 }}>
          <div
            style={{
              height: '100%',
              width: '60%',
              borderRadius: 999,
              background: 'linear-gradient(90deg,var(--sprout),var(--lime))',
            }}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            border: '1px solid var(--mist)',
            borderRadius: 'var(--radius)',
            padding: 14,
            background: 'var(--card)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
            Walk us through your sales lifecycle.
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            First touch → qualified → customer.
          </div>
          <input
            type="text"
            readOnly
            value="Sample answer text"
            style={{
              marginTop: 10,
              width: '100%',
              border: '1.5px solid var(--mist)',
              borderRadius: 10,
              background: '#FDFEFB',
              padding: '9px 11px',
              color: 'var(--ink)',
              font: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--leaf)', color: 'var(--lime)' }}
            onClick={(e) => e.preventDefault()}
          >
            Save my answers
          </button>
          <button
            style={{
              border: '1.5px solid var(--mist)',
              background: 'var(--card)',
              color: 'var(--ink)',
              borderRadius: 10,
              padding: '11px 18px',
              fontWeight: 600,
            }}
            onClick={(e) => e.preventDefault()}
          >
            Later
          </button>
        </div>
        <div style={{ marginTop: 12, color: 'var(--clay)', fontSize: 13, fontWeight: 600 }}>
          Danger / alert text sample
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
  const id = `d${token.cssVar}`;

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
          style={{ width: 90, fontFamily: "'JetBrains Mono','Consolas',monospace", fontSize: 12.5 }}
        />
      </div>
    );
  }

  if (token.type === 'font') {
    const known = FONT_OPTIONS.some((f) => f.value === value);
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: '0 0 180px', fontFamily: value }}
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
        style={{ width: 70 }}
      />
      <span className="meta-line">px</span>
    </div>
  );
}
