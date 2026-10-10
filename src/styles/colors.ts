/**
 * Colour tokens for the Text-ME dark (OLED) theme.
 *
 * These mirror the `@theme` block in `src/index.css` exactly — if you change a
 * value, change it in both places.
 *
 * Use this module where a literal string is required (SVG `fill`/`stroke`,
 * canvas, chart configs, third-party component props). For styling with
 * Tailwind, prefer the generated utilities instead — they read the same values
 * from the CSS custom properties:
 *
 *     <div className="bg-screen text-fg-muted border-divider" />
 *
 * @example
 * import { colors } from './styles/colors'
 *
 * <svg viewBox="0 0 24 24">
 *   <circle cx="12" cy="12" r="6" fill={colors.accent} />
 * </svg>
 *
 * <div style={{ backgroundColor: colors.searchBar }} />
 */
export const colors = {
  /* ── Primitives — raw palette values ─────────────────────────────────── */
  black: '#000000', // true OLED black
  white: '#ffffff',
  grey900: '#1c1c1e', // iOS dark grey
  grey800: '#2c2c2e', // iOS medium grey
  grey500: '#8e8e93', // iOS neutral muted grey
  grey400: '#a2a2a7', // iOS light muted grey
  blue: '#3478f6', // iOS system blue (dark appearance)
  blueBright: '#007aff', // iOS system blue (light appearance)
  green: '#34c759', // iOS system green
  red: '#ff3b30', // iOS system red
  teal: '#64d2ff', // iOS system teal — message tag palette
  yellow: '#ffd60a', // iOS system yellow — message tag palette
  orange: '#ff9f0a', // iOS system orange — message tag palette
  pink: '#ff375f', // iOS system pink — message tag palette
  purple: '#bf5af2', // iOS system purple — message tag palette

  /* ── 1. Backgrounds & surfaces ───────────────────────────────────────── */
  screen: '#000000', // main screen background — true OLED black
  searchBar: '#1c1c1e', // search bar background
  pill: '#2c2c2e', // pill buttons ("Edit", "All")
  nav: 'rgba(28, 28, 30, 0.85)', // floating bottom nav — #1c1c1e @ 85% opacity

  /* ── 2. Text ─────────────────────────────────────────────────────────── */
  fg: '#ffffff', // primary text — names, headers
  fgMuted: '#8e8e93', // secondary text — message previews, dates
  fgFaint: '#a2a2a7', // muted badge text

  /* ── 3. Accents, badges & indicators ─────────────────────────────────── */
  accent: '#3478f6', // active tabs, blue badges, top banner
  accentBright: '#007aff', // alternate iOS system blue
  statusActive: '#34c759', // top-left time pill
  badgeAlert: '#ff3b30', // notification / settings alert badge
  badgeMuted: '#2c2c2e', // muted unread badge background

  /* ── 4. Icons & dividers ─────────────────────────────────────────────── */
  iconActive: '#3478f6', // active navigation icon
  iconInactive: '#8e8e93', // inactive navigation icons
  iconMute: '#8e8e93', // mute / pin icons
  divider: '#2c2c2e', // separators & borders
} as const;

/** Union of every token name, e.g. `'screen' | 'fgMuted' | 'accent' | …` */
export type ColorName = keyof typeof colors;

/** A colour value from the palette, e.g. `'#3478f6'`. */
export type ColorValue = (typeof colors)[ColorName];

/**
 * Apply an opacity to a 3- or 6-digit hex colour and return `rgba(...)`.
 *
 * Useful for translucent surfaces such as the floating bottom navigation,
 * which is `#1c1c1e` at 85%.
 *
 * @example
 * withAlpha(colors.searchBar, 0.85) // 'rgba(28, 28, 30, 0.85)'
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default colors;
