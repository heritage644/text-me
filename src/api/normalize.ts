/**
 * The single place where backend payloads are mapped onto the UI's types.
 *
 * If your backend uses different field names (e.g. `_id`, `avatar`,
 * `created_at`), adapt the mappers below; nothing else in the app needs to change.
 * Every REST response and every socket payload passes through here.
 */
import type {
  Attachment,
  AuthResponse,
  Chat,
  ChatMember,
  CurrentUser,
  Message,
  MessageStatus,
  Page,
  User,
} from "../types/types";

// Raw payloads are untrusted input of unknown shape; `any` is confined to this file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const MESSAGE_STATUSES: MessageStatus[] = ["sending", "sent", "delivered", "read", "failed"];

/** Unwraps `{ data: … }` / `{ success, data }` envelopes if the backend uses them. */
export function unwrap(raw: Raw): Raw {
  return raw && typeof raw === "object" && "data" in raw && raw.data !== undefined ? raw.data : raw;
}

const id = (raw: Raw): string => String(raw?.id ?? raw?._id ?? "");
const date = (value: Raw): string | null => (value ? new Date(value).toISOString() : null);

export function toUser(raw: Raw): User {
  return {
    id: id(raw),
    name: raw.name ?? raw.displayName ?? raw.username ?? "",
    username: raw.username ?? "",
    avatarUrl: raw.avatarUrl ?? raw.avatar ?? null,
    status: raw.status ?? raw.bio ?? "",
    online: Boolean(raw.online),
    lastSeenAt: date(raw.lastSeenAt ?? raw.lastSeen),
  };
}

export function toCurrentUser(raw: Raw): CurrentUser {
  const n = raw.notifications ?? {};
  return {
    ...toUser(raw),
    online: true,
    email: raw.email ?? "",
    notifications: {
      messages: n.messages ?? true,
      groups: n.groups ?? true,
      previews: n.previews ?? true,
      sounds: n.sounds ?? true,
    },
  };
}

function toMember(raw: Raw): ChatMember {
  return { ...toUser(raw), role: raw.role === "admin" ? "admin" : "member" };
}

export function toAttachment(raw: Raw): Attachment {
  return {
    id: id(raw) || String(raw.url),
    url: raw.url,
    mime: raw.mime ?? raw.mimeType ?? "application/octet-stream",
    size: Number(raw.size ?? 0),
    name: raw.name ?? raw.filename ?? "file",
    width: raw.width ?? null,
    height: raw.height ?? null,
  };
}

export function toMessage(raw: Raw): Message {
  return {
    id: id(raw),
    chatId: String(raw.chatId ?? raw.chat ?? ""),
    senderId: String(raw.senderId ?? raw.sender?.id ?? raw.sender ?? ""),
    body: raw.body ?? raw.text ?? "",
    attachments: (raw.attachments ?? []).map(toAttachment),
    status: MESSAGE_STATUSES.includes(raw.status) ? raw.status : "sent",
    createdAt: date(raw.createdAt) ?? new Date().toISOString(),
    editedAt: date(raw.editedAt),
    ...(raw.tempId ? { tempId: String(raw.tempId) } : {}),
  };
}

export function toChat(raw: Raw): Chat {
  return {
    id: id(raw),
    type: raw.type === "group" ? "group" : "direct",
    name: raw.name ?? null,
    avatarUrl: raw.avatarUrl ?? raw.avatar ?? null,
    members: (raw.members ?? []).map(toMember),
    lastMessage: raw.lastMessage ? toMessage(raw.lastMessage) : null,
    unreadCount: Number(raw.unreadCount ?? 0),
    mentionCount: Number(raw.mentionCount ?? 0),
    pinned: Boolean(raw.pinned),
    muted: Boolean(raw.muted),
    archived: Boolean(raw.archived),
    blocked: Boolean(raw.blocked),
    createdAt: date(raw.createdAt) ?? new Date().toISOString(),
    updatedAt: date(raw.updatedAt) ?? new Date().toISOString(),
  };
}

export function toPage<T>(raw: Raw, mapItem: (item: Raw) => T): Page<T> {
  const body = unwrap(raw);
  const items = Array.isArray(body) ? body : (body?.items ?? []);
  return { items: items.map(mapItem), nextCursor: body?.nextCursor ?? null };
}

export function toAuth(raw: Raw): AuthResponse {
  const body = unwrap(raw);
  return { accessToken: body.accessToken ?? body.token, user: toCurrentUser(body.user) };
}

export function toAccessToken(raw: Raw): string {
  const body = unwrap(raw);
  return body.accessToken ?? body.token;
}
