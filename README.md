# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
"# text-me" 

## Design tokens (dark / OLED theme)

The colour palette lives in two mirrored places:

| File | What it gives you |
|---|---|
| `src/index.css` → `@theme static { … }` | Tailwind utilities **and** `var(--color-*)` custom properties |
| `src/styles/colors.ts` | Typed constants for SVG props, canvas, chart configs, inline styles |

Use the semantic name — the one that says what the colour is *for* — rather than the raw hex.

### Backgrounds & surfaces

| Token | Hex | Tailwind class |
|---|---|---|
| `screen` | `#000000` | `bg-screen` |
| `searchBar` | `#1C1C1E` | `bg-search-bar` |
| `pill` | `#2C2C2E` | `bg-pill` |
| `nav` | `#1C1C1E` @ 85% | `bg-nav` |

### Text

| Token | Hex | Tailwind class |
|---|---|---|
| `fg` | `#FFFFFF` | `text-fg` |
| `fgMuted` | `#8E8E93` | `text-fg-muted` |
| `fgFaint` | `#A2A2A7` | `text-fg-faint` |

### Accents, badges & indicators

| Token | Hex | Tailwind class |
|---|---|---|
| `accent` | `#3478F6` | `bg-accent` / `text-accent` |
| `accentBright` | `#007AFF` | `bg-accent-bright` |
| `statusActive` | `#34C759` | `bg-status-active` |
| `badgeAlert` | `#FF3B30` | `bg-badge-alert` |
| `badgeMuted` | `#2C2C2E` | `bg-badge-muted` |

### Icons & dividers

| Token | Hex | Tailwind class |
|---|---|---|
| `iconActive` | `#3478F6` | `text-icon-active` |
| `iconInactive` | `#8E8E93` | `text-icon-inactive` |
| `iconMute` | `#8E8E93` | `text-icon-mute` |
| `divider` | `#2C2C2E` | `border-divider` |

Raw primitives (`grey-900`, `grey-800`, `grey-500`, `grey-400`, `blue`, `blue-bright`, `green`, `red`, plus Tailwind's own `black` / `white`) are also available for one-offs.

### Usage

```tsx
// 1. Tailwind utilities (preferred)
<div className="bg-screen text-fg-muted border-b border-divider" />

// 2. CSS custom properties — inline styles and SVG attributes
<div style={{ backgroundColor: 'var(--color-search-bar)' }} />
<circle fill="var(--color-accent)" />

// 3. Typed constants — where a literal string is required
import { colors, withAlpha } from './styles/colors'

<circle fill={colors.accent} />
<div style={{ backgroundColor: withAlpha(colors.searchBar, 0.85) }} />
```

Opacity modifiers work on any token: `bg-nav/50`, `text-fg/60`.

Keep `src/index.css` and `src/styles/colors.ts` in sync — they hold the same values.

