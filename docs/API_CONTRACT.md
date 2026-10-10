# Text-ME API contract

This is the contract the frontend is built against. Mock mode (`VITE_USE_MOCKS=true`) implements exactly this, so anything that works in mock mode will work against a backend that follows this document.

- REST paths are relative to `VITE_API_BASE_URL` (e.g. `http://localhost:3000/api`).
- The WebSocket endpoint is `VITE_WS_URL` (e.g. `ws://localhost:3000/ws`).
- The client sends and expects JSON (`Content-Type: application/json`), except `POST /uploads` (multipart).
- Every request is sent with `credentials: "include"`.
- Timestamps are ISO-8601 strings in UTC (`2026-10-10T09:41:00.000Z`). IDs are strings.

> **Field names are flexible.** All responses pass through [`src/api/normalize.ts`](../src/api/normalize.ts), which already accepts some common variants (`_id`, `avatar`, `text`, `{ data: … }` envelopes, `mimeType`, Zod-style errors). If your backend differs in other ways, change that one file instead of the backend or the UI.

## Contents

1. [Auth flow](#1-auth-flow)
2. [Errors](#2-errors)
3. [Pagination](#3-pagination)
4. [Models](#4-models)
5. [Endpoints](#5-endpoints)
6. [WebSocket](#6-websocket)
7. [Changes from the proposed list](#7-changes-from-the-proposed-list)

---

## 1. Auth flow

| Token | Lifetime (suggested) | Where it lives | How it's sent |
| --- | --- | --- | --- |
| Access token (JWT or opaque) | 5–15 min | **JS memory only** (never `localStorage`) | `Authorization: Bearer <token>` |
| Refresh token | 7–30 days | **httpOnly cookie** set by the server | Automatically, because of `credentials: "include"` |

Recommended refresh cookie: `HttpOnly; Secure; SameSite=Lax; Path=/api/auth`. Use `SameSite=None; Secure` if the API is on a different site than the frontend. Rotate it on every `/auth/refresh`.

**Flow:**

1. **Login/register** returns `{ accessToken, user }` and sets the refresh cookie.
2. **Page load:** the client has no token in memory, so it calls `POST /auth/refresh`.
   - Success → `GET /users/me` → signed in.
   - 401 → shows the login screen.
3. **Any request that returns 401** (except auth endpoints):
   - The client calls `POST /auth/refresh` once. Concurrent 401s share a single refresh.
   - It then retries the original request with the new token.
   - If the refresh itself returns **401/403**, the session ends and the user goes to `/login`. After signing in again they return to the page they were on.
   - If the refresh fails because of the network or a 5xx, the user is **not** logged out.
4. **WebSocket:** the first frame after connecting is `auth` with the access token (see [§6](#6-websocket)).
5. **Logout:** `POST /auth/logout` clears the cookie. The client drops its in-memory token whatever the response is.

**CORS:** only needed if the API is on a different origin than the frontend. In development the Vite server proxies `/api` and `/ws` to `DEV_PROXY_TARGET`, so no CORS setup is needed there. For cross-origin production deployments, send:

```
Access-Control-Allow-Origin: https://your-frontend.example   (exact origin, not *)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
```

## 2. Errors

Every non-2xx response should have this body:

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Please check the highlighted fields.",
    "fields": { "username": "That username is taken." }
  }
}
```

- `code` is a stable machine-readable string.
- `message` is human-readable and is shown in toasts or form banners.
- `fields` is optional. Its keys **must match request field names**, so the client can show each message under the matching input.
- The legacy shape `{ "message": "...", "errors": [{ "field": "email", "message": "..." }] }` (or `path: ["email"]`) is also accepted.

| Status | `code` (suggested) | How the client handles it |
| --- | --- | --- |
| 400 / 422 | `VALIDATION` | Shows `fields` messages under the inputs; otherwise `message` in a toast/banner |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` | Refresh + retry; on auth forms, shows the message |
| 403 | `FORBIDDEN` | Toast |
| 404 | `NOT_FOUND` | Inline "not found" state (e.g. a deleted chat) |
| 409 | `CONFLICT`, `USERNAME_TAKEN`, `EMAIL_TAKEN` | Field error if `fields` is present, else toast |
| 413 | `FILE_TOO_LARGE` | Error on the upload thumbnail |
| 415 | `UNSUPPORTED_TYPE` | Error on the upload thumbnail |
| 429 | `RATE_LIMITED` | Toast ("wait a moment") |
| 500 | `INTERNAL` | Toast or inline error with Retry. Queries retry twice with backoff |
| 502 / 503 | — | Treated as "couldn't reach the server" |
| 504 / client timeout (15 s, 120 s for uploads) | — | Treated as a timeout |
| no response | — | "Offline" if `navigator.onLine` is false, otherwise a network error |

## 3. Pagination

Lists use cursor pagination:

```
GET /chats?limit=30&cursor=<opaque>
```

```json
{ "items": [ … ], "nextCursor": "opaque-string-or-null" }
```

- `limit` defaults to 30, maximum 100.
- `cursor` is omitted for the first page.
- `nextCursor: null` means there are no more pages.
- Cursors are opaque to the client. Encode whatever you need in them (e.g. `createdAt|id`, base64).

## 4. Models

### User

```ts
{
  id: string;
  name: string;
  username: string;          // unique, 3–20 chars [a-zA-Z0-9_], case-insensitive
  avatarUrl: string | null;
  status: string;            // free-text profile status, "" if none, max 140 chars
  online: boolean;
  lastSeenAt: string | null; // ISO date
}
```

### CurrentUser (`/users/me`, auth responses)

```ts
User & {
  email: string;
  notifications: { messages: boolean; groups: boolean; previews: boolean; sounds: boolean };
}
```

### Chat

All flags are **per requesting user**.

```ts
{
  id: string;
  type: "direct" | "group";
  name: string | null;          // groups only; null for direct chats
  avatarUrl: string | null;     // groups only
  members: Array<User & { role: "admin" | "member" }>;  // includes the current user
  lastMessage: Message | null;
  unreadCount: number;          // unread messages for the current user
  mentionCount: number;         // unread messages that @mention the current user
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  blocked: boolean;             // direct chats: current user has blocked the other member
  createdAt: string;
  updatedAt: string;            // bump on every new message (used for ordering)
}
```

### Message

```ts
{
  id: string;
  chatId: string;
  senderId: string;
  body: string;                 // may be "" when attachments are present; max 4000 chars
  attachments: Attachment[];
  status: "sent" | "delivered" | "read";   // aggregate for the sender: read = read by the other member (direct) or by everyone (group)
  createdAt: string;
  editedAt: string | null;
  tempId?: string;              // echo the client's tempId on the sender's copy (see §6)
}
```

The client also uses `"sending"` and `"failed"` locally. The server never sends them.

### Attachment

```ts
{
  id: string;
  url: string;          // absolute or root-relative; must be loadable by <img src>
  mime: string;         // e.g. "image/jpeg", "application/pdf"
  size: number;         // bytes
  name: string;         // original filename
  width: number | null; // pixels, images/videos only (reserves space, prevents layout shift)
  height: number | null;
}
```

## 5. Endpoints

**Auth** column: 🔓 = no token needed, 🔒 = `Authorization: Bearer` required. Every 🔒 endpoint can also return `401`. Responses are `200` unless noted.

### Auth

#### `POST /auth/register` 🔓

```json
{ "name": "Ada Okafor", "username": "ada", "email": "ada@example.com", "password": "at-least-6" }
```

- **201** → `{ "accessToken": "…", "user": CurrentUser }`, plus the refresh cookie.
- **422** → `fields` on `name`, `username`, `email`, `password`.
- **409** → `fields.username` or `fields.email` (already taken).

#### `POST /auth/login` 🔓

```json
{ "email": "ada@example.com", "password": "…" }
```

- **200** → `{ "accessToken": "…", "user": CurrentUser }`, plus the refresh cookie.
- **401** `INVALID_CREDENTIALS` → shown as a form error.
- **422** → field errors.
- **429** → too many attempts.

#### `POST /auth/logout` 🔓 (uses the cookie)

- **204**. Clears the refresh cookie and revokes the refresh token.

#### `POST /auth/refresh` 🔓 (uses the cookie)

- **200** → `{ "accessToken": "…" }`. Rotate the refresh cookie. `user` may be included but is ignored.
- **401** → no cookie, or the token is invalid/expired/revoked. The client signs out.

#### `POST /auth/forgot-password` 🔓

```json
{ "email": "ada@example.com" }
```

- **204** whether or not the email exists, so the endpoint doesn't reveal accounts.
- Sends an email linking to `https://<frontend>/reset-password?token=<token>`.

#### `POST /auth/reset-password` 🔓

```json
{ "token": "…", "password": "new-password" }
```

- **204**. Optionally revoke all of the user's refresh tokens.
- **400** `TOKEN_INVALID` / `TOKEN_EXPIRED` → the UI offers to send a new link.
- **422** → `fields.password`.

### Users

#### `GET /users/me` 🔒

- → `CurrentUser`.

#### `PATCH /users/me` 🔒

Every field is optional, and `notifications` is merged with the stored settings:

```json
{
  "name": "Ada O.",
  "username": "ada",
  "status": "At work",
  "avatarUrl": "https://…",
  "notifications": { "sounds": false }
}
```

- → the updated `CurrentUser`.
- **409** → `fields.username`.
- **422** → field errors.

#### `POST /users/me/password` 🔒

```json
{ "currentPassword": "…", "newPassword": "…" }
```

- **204**.
- **401** or **422** with `fields.currentPassword` when it's wrong. Return field errors, not a bare 401, so the client doesn't try to refresh.
- **422** → `fields.newPassword`.

#### `GET /users?search=&cursor=&limit=` 🔒

- → `Page<User>`.
- Matches `name` or `username` (prefix or contains, case-insensitive).
- Excludes the current user.
- With an **empty `search`**, returns the user's contacts or suggested people, so the Contacts screen isn't empty.

#### `POST /users/:id/block` 🔒

- **204**. Blocked users can't message the blocker or see their presence.
- Set `blocked: true` on the direct chat (if any) and emit `chat:updated` to the blocker.

#### `DELETE /users/:id/block` 🔒

- **204**. The reverse of the above.

### Chats

#### `GET /chats?cursor=&limit=` 🔒

- → `Page<Chat>`.
- Sort order: **pinned first**, then by `updatedAt` descending.
- Excludes `archived` chats.

#### `POST /chats` 🔒

Direct chat:

```json
{ "type": "direct", "memberIds": ["u_123"] }
```

- **Idempotent:** returns the existing direct chat with that user if there is one (200), otherwise creates it (201).

Group chat:

```json
{ "type": "group", "name": "Lagos Devs", "memberIds": ["u_1", "u_2"], "avatarUrl": "https://…" }
```

- The creator is added automatically as `admin`. `avatarUrl` is optional.
- → **201** `Chat`.
- **422** → `fields.name` or `fields.memberIds`.
- **403** → when blocked.

Emit `chat:updated` to the other members.

#### `GET /chats/:id` 🔒

- → `Chat`.
- **404** if it doesn't exist or the user isn't a member.

#### `PATCH /chats/:id` 🔒

Every field is optional:

```json
{ "name": "New name", "avatarUrl": "…", "pinned": true, "muted": false, "archived": false }
```

- `pinned`, `muted` and `archived` are **per user**.
- `name` and `avatarUrl` are for groups only. They may be restricted to admins (**403** otherwise), and changing them should emit `chat:updated` to all members.
- → the updated `Chat`.

#### `DELETE /chats/:id` 🔒

- **204**. Removes the chat from **this user's** list (hides it and clears their history). It does not delete the chat for the other members.

#### `POST /chats/:id/members` 🔒 (groups)

```json
{ "userIds": ["u_7", "u_8"] }
```

- → the updated `Chat`. Emit `chat:updated` to all members.

#### `DELETE /chats/:id/members/:userId` 🔒 (groups)

- **204**. Removing **yourself** means leaving the group. Removing others may require admin (**403**).
- Emit `chat:updated` to the remaining members.

#### `GET /chats/:id/media?cursor=&limit=` 🔒 *(added)*

- → `Page<Attachment>`: attachments from the chat's messages, newest first. Used by the Chat info panel.

#### `POST /chats/:id/read` 🔒

```json
{ "messageId": "m_999" }
```

- **204**. Marks everything up to and including this message as read.
- Resets `unreadCount` and `mentionCount` for this user.
- Emits `message:status` (`read`) to the senders.

This is the REST fallback for the socket's `message:read`.

### Messages

#### `GET /chats/:id/messages?cursor=&limit=&after=` 🔒

- → `Page<Message>`, **newest first**. `nextCursor` points to **older** messages.
- `after=<ISO date>` *(added)* returns only messages created strictly after that time, newest first, still capped by `limit`. The client uses it to catch up after a reconnect. If `nextCursor` is non-null, it reloads the thread instead.

#### `POST /chats/:id/messages` 🔒

```json
{ "tempId": "tmp_abc", "body": "Hello", "attachments": [Attachment] }
```

- **201** → `Message`, with `tempId` echoed back.
- **422** → when both `body` and `attachments` are empty.
- **403** → blocked, or not a member.

This is the REST fallback when the socket isn't connected. Also broadcast `message:new` to the other members, and to the sender's *other* connections.

#### `PATCH /messages/:id` 🔒

```json
{ "body": "edited text" }
```

- → `Message` with `editedAt` set. Sender only (**403**).

*The UI doesn't expose editing yet; the API function exists.*

#### `DELETE /messages/:id` 🔒

- **204**. Sender only. *The UI doesn't expose deleting yet; the API function exists.*

### Uploads

#### `POST /uploads` 🔒

Request: `multipart/form-data`:

- `file`: the file.
- `width` and `height` (optional): the client sends these for images, measured in the browser.

Response: **201** → `Attachment`:

```json
{ "id": "att_1", "url": "https://cdn…/file.jpg", "mime": "image/jpeg", "size": 123456, "name": "photo.jpg", "width": 1200, "height": 800 }
```

The proposed `{url, mime, size}` is extended with `id`, `name`, `width` and `height`.

Errors:

- **413** `FILE_TOO_LARGE`: the client limit is **25 MB**.
- **415** `UNSUPPORTED_TYPE`.

Files are uploaded as soon as they're picked; the returned `Attachment` objects are then included in `message:send`.

---

## 6. WebSocket

**Transport:** native WebSocket at `VITE_WS_URL`. Every frame, in both directions, is JSON:

```json
{ "event": "message:new", "data": { … } }
```

> Using Socket.IO instead? Replace the transport in [`src/realtime/socket.ts`](../src/realtime/socket.ts) (`createWebSocketTransport`). Event names and payloads stay the same.

### Connection lifecycle

| Step | Direction | Frame |
| --- | --- | --- |
| 1 | c → s | `{ "event": "auth", "data": { "token": "<accessToken>" } }`, sent as soon as the socket opens |
| 2a | s → c | `{ "event": "auth:ok" }`: the connection is live |
| 2b | s → c | `{ "event": "auth:error", "data": { "code": "TOKEN_EXPIRED" } }`: the client refreshes the token and reconnects |
| — | c → s | `{ "event": "ping" }` every **25 s** |
| — | s → c | `{ "event": "pong" }`. If none arrives within **10 s**, the client drops the connection and reconnects |

- **Reconnects:** exponential backoff with jitter, from 0.5 s up to 30 s. When the browser comes back online, the client reconnects immediately.
- **Catching up:** after every *re*connect the client refetches the chat list and calls `GET /chats/:id/messages?after=` for each open thread. The server doesn't need to replay missed events.
- **Server-side fan-out:** join each connection to a room per chat the user belongs to, plus a per-user room (for presence and `chat:updated`).

### Client → server

| Event | Payload | Server should |
| --- | --- | --- |
| `message:send` | `{ tempId, chatId, body, attachments? }` | Persist, reply to the sender with `message:ack`, broadcast `message:new` to the other members (and the sender's other connections). On failure, reply `message:error` |
| `typing:start` | `{ chatId }` | Broadcast `typing { chatId, userId, isTyping: true }` to the other members. Auto-expire after ~5 s without a refresh |
| `typing:stop` | `{ chatId }` | Broadcast `typing { …, isTyping: false }` |
| `message:read` | `{ chatId, messageId }` | Same as `POST /chats/:id/read` |

The client sends `typing:start` at most once per typing burst and `typing:stop` after 3 s of no input, or on send or blur.

### Server → client

| Event | Payload | Client does |
| --- | --- | --- |
| `message:new` | `Message` | Appends to the thread and updates the chat row. Increments unread unless the chat is open and visible. Increments mentions if the body contains `@<username>` |
| `message:ack` | `{ tempId, message: Message }` | Replaces the optimistic message (matched by `tempId`) with the server's copy |
| `message:error` *(added)* | `{ tempId, error: { code, message } }` | Marks the optimistic message as failed and shows Retry |
| `message:status` | `{ chatId, messageId, status }` | Updates the ticks. *(`chatId` added, so the client can find the message without scanning every chat)* |
| `typing` | `{ chatId, userId, isTyping }` | Shows or hides the typing indicator. The client also auto-clears it after 6 s |
| `presence` | `{ userId, online, lastSeenAt }` | Updates online dots and "last seen". Send it to users who share a chat |
| `chat:updated` | `Chat` (from the receiving user's point of view) | Upserts the chat: renames, members, block state, or a new chat created by someone else |

**Optimistic send timeline (client):**

1. The message appears immediately with status `sending` and `id = tempId`.
2. It is emitted over the socket. If the socket isn't connected, it goes through `POST /chats/:id/messages` instead.
3. `message:ack` arrives → the message is replaced with the server's copy (status `sent`).
4. `message:error`, or no ack within **10 s** → `failed`. "Tap to retry" re-sends with the **same** `tempId`.

**Idempotency:** the server should de-duplicate on `(senderId, tempId)`. If the original send was in fact saved (only the ack was lost), return or ack the existing message instead of creating a duplicate. This applies to both `message:send` and `POST /chats/:id/messages`.

---

## 7. Changes from the proposed list

**Added endpoints:**

- `POST /users/me/password` for the Settings "change password" form.
- `POST /users/:id/block` and `DELETE /users/:id/block` for blocking from Chat info.
- `GET /chats/:id/media` for the media grid in Chat info.

**Extended requests and responses:**

- `GET /chats/:id/messages` gains `after=` for catching up after a reconnect.
- `PATCH /users/me` also accepts `notifications`.
- `POST /chats` (group) accepts an optional `avatarUrl`. Direct `POST /chats` is idempotent.
- `POST /uploads` returns `id`, `name`, `width` and `height` as well as `url`, `mime` and `size`.
- `register`, `login` and `refresh` return `{ accessToken, user }`. For `refresh`, `user` is optional.

**New fields and behaviours:**

- `Chat.blocked`, `Chat.mentionCount` (red badge) and `Chat.archived`.
- `GET /chats` puts pinned chats first and leaves out archived ones.
- An empty `GET /users?search=` returns contacts or suggestions.

**WebSocket additions:**

- The `{ event, data }` frame format.
- The `auth`, `auth:ok`, `auth:error`, `ping` and `pong` control frames.
- The `message:error` event.
- `chatId` in the `message:status` payload.
