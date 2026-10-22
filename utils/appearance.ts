import type { AppearanceConfig, ScreenAppearance } from '../types';

export const ELECTRIC_BLUE = '#1464ff';
export const DEFAULT_APPEARANCE: AppearanceConfig = {
  organizer: { accent: ELECTRIC_BLUE, mode: 'light' },
  tv: { accent: ELECTRIC_BLUE, mode: 'dark' },
};
export const COLOR_PRESETS = [
  { name: 'Bleu électrique', color: ELECTRIC_BLUE },
  { name: 'Rouge SRC', color: '#c92336' },
  { name: 'Orange basket', color: '#ed7020' },
  { name: 'Violet', color: '#7c3aed' },
  { name: 'Menthe', color: '#46cfa5' },
  { name: 'Bleu pétrole', color: '#16858c' },
];
const validHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export function resolveAppearance(value?: Partial<AppearanceConfig> | null): AppearanceConfig {
  const screen = (raw: Partial<ScreenAppearance> | undefined, fallback: ScreenAppearance): ScreenAppearance => ({
    accent: validHex(raw?.accent) ? raw.accent.toLowerCase() : fallback.accent,
    mode: raw?.mode === 'light' || raw?.mode === 'dark' ? raw.mode : fallback.mode,
  });
  return { organizer: screen(value?.organizer, DEFAULT_APPEARANCE.organizer), tv: screen(value?.tv, DEFAULT_APPEARANCE.tv) };
}
function rgb(color: string) { return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)); }
export function mix(color: string, target: string, proportion: number) {
  const end = rgb(target);
  return '#' + rgb(color).map((c, i) => Math.round(c + (end[i] - c) * proportion).toString(16).padStart(2, '0')).join('');
}
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => rgb(hex).map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableAccent(accent: string, background: string) {
  const target = contrast('#ffffff', background) > contrast('#000000', background) ? '#ffffff' : '#000000';
  for (let i = 0; i <= 20; i++) {
    const candidate = mix(accent, target, i / 20);
    if (contrast(candidate, background) >= 4.5) return candidate;
  }
  return target;
}
export function themeVariables(screen: ScreenAppearance): Record<string, string> {
  const dark = screen.mode === 'dark';
  const panel = dark ? '#0d2443' : '#ffffff';
  const darkInk = contrast('#071426', screen.accent) >= 4.5 ? '#071426' : '#000000';
  const accentText = contrast('#ffffff', screen.accent) >= contrast(darkInk, screen.accent) ? '#ffffff' : darkInk;
  return {
    '--ui-accent': screen.accent,
    '--ui-accent-text': accentText,
    '--ui-accent-ink': readableAccent(screen.accent, panel),
    '--ui-accent-soft': mix(screen.accent, panel, dark ? 0.78 : 0.91),
    '--ui-bg': dark ? '#07172d' : '#f2f6fd',
    '--ui-panel': panel,
    '--ui-panel-alt': dark ? '#142f50' : '#eaf0fa',
    '--ui-text': dark ? '#f0f5ff' : '#102441',
    '--ui-muted': dark ? '#b2c3dc' : '#52647e',
    '--ui-line': dark ? '#2a4466' : '#d8e2f0',
    '--ui-nav': mix(screen.accent, '#061426', 0.88),
    '--ui-header': mix(screen.accent, '#061426', 0.78),
    '--ui-nav-text': '#f5f8ff',
  };
}
