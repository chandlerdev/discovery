// ─────────────────────────────────────────────────────────────────────────────
//  Admin appearance settings. The whole portal is styled through the CSS custom
//  properties declared in globals.css :root, so "theming" is just overriding those
//  variables on <html> and remembering the overrides in localStorage.
// ─────────────────────────────────────────────────────────────────────────────

export type TokenType = 'color' | 'font' | 'size';

export interface ThemeToken {
  /** The CSS custom property this control writes to, e.g. "--leaf". */
  cssVar: string;
  label: string;
  hint?: string;
  group: 'Colors' | 'Typography' | 'Shape';
  type: TokenType;
  /** The stock value from globals.css — what "Reset" restores. */
  default: string;
}

/** Curated font stacks. Values only reference web-safe or already-bundled families. */
export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Inter (default)', value: "'Inter','Segoe UI',system-ui,sans-serif" },
  { label: 'Sora', value: "'Sora','Inter',system-ui,sans-serif" },
  { label: 'System UI', value: "system-ui,-apple-system,'Segoe UI',sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI',Tahoma,Geneva,sans-serif" },
  { label: 'Tahoma', value: 'Tahoma,Geneva,Verdana,sans-serif' },
  { label: 'Verdana', value: 'Verdana,Geneva,sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS',Helvetica,sans-serif" },
  { label: 'Georgia (serif)', value: "Georgia,'Times New Roman',serif" },
  { label: 'Times (serif)', value: "'Times New Roman',Times,serif" },
  { label: 'Courier (mono)', value: "'JetBrains Mono','Courier New',monospace" },
];

export const THEME_TOKENS: ThemeToken[] = [
  // Colors
  { cssVar: '--leaf', label: 'Admin (primary) color', hint: 'Buttons, tab bar, totals', group: 'Colors', type: 'color', default: '#1B4332' },
  { cssVar: '--deep', label: 'Header background', group: 'Colors', type: 'color', default: '#10241A' },
  { cssVar: '--sprout', label: 'Accent', hint: 'Highlights, focus rings', group: 'Colors', type: 'color', default: '#74C365' },
  { cssVar: '--lime', label: 'Highlight', hint: 'Active tab, primary button text', group: 'Colors', type: 'color', default: '#C6F26E' },
  { cssVar: '--paper', label: 'Page background', group: 'Colors', type: 'color', default: '#FBFDF7' },
  { cssVar: '--card', label: 'Card background', group: 'Colors', type: 'color', default: '#FFFFFF' },
  { cssVar: '--ink', label: 'Text color', group: 'Colors', type: 'color', default: '#152B1F' },
  { cssVar: '--muted', label: 'Muted text', hint: 'Secondary labels, hints', group: 'Colors', type: 'color', default: '#5E7266' },
  { cssVar: '--mist', label: 'Borders', group: 'Colors', type: 'color', default: '#E4EEE2' },
  { cssVar: '--clay', label: 'Danger / alert', group: 'Colors', type: 'color', default: '#E4572E' },
  // Typography
  { cssVar: '--font-body', label: 'Body font', group: 'Typography', type: 'font', default: "'Inter','Segoe UI',system-ui,sans-serif" },
  { cssVar: '--font-heading', label: 'Heading font', group: 'Typography', type: 'font', default: "'Sora','Inter',system-ui,sans-serif" },
  // Shape
  { cssVar: '--radius', label: 'Corner radius', hint: '0–28 px', group: 'Shape', type: 'size', default: '14px' },
];

export type ThemeSettings = Record<string, string>;

/** The stock theme — every token at its globals.css value. */
export const DEFAULT_THEME: ThemeSettings = Object.fromEntries(
  THEME_TOKENS.map((t) => [t.cssVar, t.default]),
);

const STORAGE_KEY = 'desss-admin-theme';

/** Reads the saved overrides, merged onto the defaults so new tokens always resolve. */
export function loadTheme(): ThemeSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as ThemeSettings) : {};
    return { ...DEFAULT_THEME, ...saved };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveTheme(theme: ThemeSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* storage full or blocked — the live styles still apply for this session */
  }
}

export function clearTheme(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Writes every token onto <html> so the CSS variables take effect app-wide. */
export function applyTheme(theme: ThemeSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const { cssVar } of THEME_TOKENS) {
    const value = theme[cssVar] ?? DEFAULT_THEME[cssVar];
    root.style.setProperty(cssVar, value);
  }
}
