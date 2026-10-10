# Text-ME

A responsive real-time chat frontend built with React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query and a small WebSocket client.

It is **API-ready and has no mock layer**: every screen reads and writes through `src/api`, against the contract in [docs/API_CONTRACT.md](docs/API_CONTRACT.md). Point `VITE_API_BASE_URL` and `VITE_WS_URL` at your backend and it works — no code changes.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173, proxying /api and /ws to DEV_PROXY_TARGET
```

Out of the box the dev server forwards `/api` and `/ws` to `http://localhost:3000`. Start your backend there (or set `DEV_PROXY_TARGET` in `.env.development.local`) and sign in. Until a backend answers, the app shows its normal error states ("Couldn't reach the server") rather than fake data.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

Requires Node 20+.

## Environment variables

| Variable | Used by | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | app | `/api` or `https://api.example.com/api` | REST base URL; a path is resolved against the page origin |
| `VITE_WS_URL` | app | `/ws` or `wss://api.example.com/ws` | WebSocket URL; a path becomes `ws(s)://<page host>/ws` |
| `DEV_PROXY_TARGET` | dev server | `http://localhost:3000` | Where the Vite dev server proxies `/api` and `/ws` |
| `DEV_ALLOWED_HOSTS` | dev server | `.app.github.dev` | Extra hostnames the dev server accepts (comma-separated) |

- `.env.development` is committed and points at `/api` and `/ws` on the dev server.
- `.env.example` documents a production setup.
- Put personal overrides in `.env.development.local` (git-ignored).

### Pointing the app at your backend

In development, create `.env.development.local`:

```bash
# only needed if your API isn't on :3000
DEV_PROXY_TARGET=http://localhost:4000
```

The browser calls `/api/...` and `/ws` on the Vite origin, and Vite forwards them to `DEV_PROXY_TARGET`. That means no CORS setup and a first-party refresh cookie.

For production, set these at build time:

```bash
VITE_API_BASE_URL=https://api.example.com/api
VITE_WS_URL=wss://api.example.com/ws
```

Alternatively, serve the frontend and API from the same origin and use `/api` and `/ws`.

The backend must implement **[docs/API_CONTRACT.md](docs/API_CONTRACT.md)**. If your field names differ, adapt [`src/api/normalize.ts`](src/api/normalize.ts) rather than the components.

## Message tags

Messages can be labelled with your own tags ("Work", "Invoice", "Read later"):

- Hover a bubble (or look next to it on touch) and press the tag button to add, remove or create tags.
- Tags show as coloured chips under the bubble; tapping a chip — or the tag button in the thread header — narrows the thread to that tag, which is a server-side search (`GET /tags/:id/messages?chatId=`) recorded in the URL as `?tag=<id>`.
- "Manage tags" in the picker renames, recolours and deletes tags.
- Tags are personal: they belong to you, not to the chat, so nobody else sees them.

The whole surface is optional for the backend. Without the tag endpoints the app still runs; a `Message` with no `tags` field is read as `tags: []`. See [docs/API_CONTRACT.md](docs/API_CONTRACT.md#message-tags).

## Project structure

```
src/
  api/                  HTTP layer: the only code that talks to the network
    client.ts           fetch wrapper: auth header, single-flight refresh on 401, timeouts, error mapping
    endpoints.ts        every REST path in one place
    errors.ts           ApiError (offline / timeout / network / 4xx kinds / server)
    normalize.ts        backend payload → UI types (adapt here if your API differs)
    *.api.ts            auth, users, chats, messages, tags, uploads
  realtime/
    socket.ts           WebSocket client: auth frame, heartbeat, backoff + jitter, resync
    events.ts           event names + payload types
    use-socket-event.ts useSocketEvent(name, handler), useConnectionState()
    presence-store.ts   presence, typing and active chat (zustand)
    realtime-provider.tsx  connects while signed in; applies server events to the query cache
    resync.ts           catch-up after reconnect
  features/
    auth/               session store, auth provider, login / signup / forgot / reset pages
    chats/              chat list, filters, swipe/hover actions, cache helpers
    thread/             message list (virtualised), bubbles, composer, uploads, optimistic send
    chat-info/          info panel: members, mute, media, leave, block
    tags/               message tags: picker, filter, colour palette, cache helpers
    contacts/           user search, start 1:1, create group
    settings/           profile, password, notifications, logout
  components/ui/        Button, TextField, Avatar, Badge, Pill, Skeleton, Modal, Toast, EmptyState, …
  hooks/                generic hooks (debounce, online status, intersection, upload)
  lib/                  env, query client, formatting, ids, form-error mapping
  routes/               routes, guards, layout, bottom nav
  styles/colors.ts      JS mirror of the design tokens in src/index.css
  types/types.ts        every model, request and event payload type
docs/API_CONTRACT.md    the backend contract
```

### Conventions

- **Components never fetch.** They use hooks in `features/*/hooks.ts`, which call `src/api/*.api.ts`. TanStack Query owns server state; zustand holds the session and realtime UI state.
- **Tokens:** the access token lives in memory only, and the refresh token is an httpOnly cookie. Nothing is kept in `localStorage`.
- **Design tokens:** colours come only from `@theme` in `src/index.css` (`bg-screen`, `bg-accent`, `border-divider`, …), mirrored in `src/styles/colors.ts`. Don't hardcode hex values.
- **Files:** kebab-case filenames, one component per file, types in `src/types/types.ts`.
- **Routes** are code-split with `React.lazy`.
- **Nothing is faked.** There is no fixture data anywhere: if a screen shows something, it came from the API.

## Layout

| Width | Layout |
| --- | --- |
| < 768 px | One screen at a time. The thread is its own route with a back button, and there's a floating bottom nav |
| ≥ 768 px (`md`) | Two panes: sidebar (chats / contacts / settings) + thread |
| ≥ 1024 px (`lg`) | The info panel opens as a third column (`/chats/:id/info`) |

Safe-area insets, `100dvh` sizing (the composer stays above the on-screen keyboard), 44 px touch targets, visible focus rings, `aria-live` announcements and `prefers-reduced-motion` are supported throughout.
