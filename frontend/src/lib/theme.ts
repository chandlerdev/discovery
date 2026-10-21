// ─────────────────────────────────────────────────────────────────────────────
//  Client-site theming. Each client's design is set by an admin and stored on the
//  server; this module just applies a theme (a map of CSS-variable overrides) onto
//  <html> so the whole page renders in that client's colours/fonts/shape.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeSettings = Record<string, string>;

/** Every themeable CSS custom property, with its stock value from globals.css. */
export const THEME_DEFAULTS: ThemeSettings = {
  '--leaf': '#1B4332',
  '--deep': '#10241A',
  '--sprout': '#74C365',
  '--lime': '#C6F26E',
  '--paper': '#FBFDF7',
  '--card': '#FFFFFF',
  '--ink': '#152B1F',
  '--muted': '#5E7266',
  '--mist': '#E4EEE2',
  '--clay': '#E4572E',
  '--font-body': "'Inter','Segoe UI',system-ui,sans-serif",
  '--font-heading': "'Sora','Inter',system-ui,sans-serif",
  '--radius': '14px',
};

/** Writes each variable onto <html> so the CSS variables take effect site-wide. */
export function applyTheme(theme: ThemeSettings | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const merged = { ...THEME_DEFAULTS, ...(theme || {}) };
  for (const [cssVar, value] of Object.entries(merged)) {
    root.style.setProperty(cssVar, value);
  }
}
