/**
 * Every data shape the frontend uses, in one place.
 *
 * These are the *normalised* shapes the UI consumes. Raw backend payloads are
 * mapped onto them in `src/api/normalize.ts`, so if the backend's field names
 * differ, change that file — not these types and not the components.
 */

export type ID = string;
/** ISO-8601 timestamp, e.g. `2026-10-10T09:41:00.000Z`. */
export type ISODate = string;

/* ── Models ─────────────────────────────────────────────────────────────── */

export type User = {
  id: ID;
  name: string;
  username: string;
  avatarUrl: string | null;
  /** Free-text profile status, e.g. "At the gym". */
  status: string;
  online: boolean;
  lastSeenAt: ISODate | null;
};

export type NotificationSettings = {
  messages: boolean;
  groups: boolean;
  previews: boolean;
  sounds: boolean;
};

/** The signed-in user (`GET /users/me`). */
export type CurrentUser = User & {
  email: string;
  notifications: NotificationSettings;
};

export type ChatType = "direct" | "group";
export type MemberRole = "admin" | "member";
export type ChatMember = User & { role: MemberRole };

export type Chat = {
  id: ID;
  type: ChatType;
  /** Group name. `null` for direct chats — the UI shows the other member's name. */
  name: string | null;
  avatarUrl: string | null;
  members: ChatMember[];
  lastMessage: Message | null;
  unreadCount: number;
  /** Unread messages that @mention the current user (drives the red badge). */
  mentionCount: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** Direct chats only: the current user has blocked the other member. */
  blocked: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
};

export type Attachment = {
  id: ID;
  url: string;
  mime: string;
  size: number;
  name: string;
  /** Pixel dimensions for images/videos, used to reserve space and avoid layout shift. */
  width: number | null;
  height: number | null;
};

/** `sending` and `failed` are client-only; the server only reports sent/delivered/read. */
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type Message = {
  id: ID;
  chatId: ID;
  senderId: ID;
  body: string;
  attachments: Attachment[];
  status: MessageStatus;
  createdAt: ISODate;
  editedAt: ISODate | null;
  /** Client-generated id for optimistic sends; echoed back by the server for de-duplication. */
  tempId?: string;
};

/* ── Pagination ─────────────────────────────────────────────────────────── */

export type Page<T> = { items: T[]; nextCursor: string | null };
export type PageParams = { cursor?: string | null; limit?: number };

/* ── Requests ───────────────────────────────────────────────────────────── */

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = { name: string; username: string; email: string; password: string };
export type AuthResponse = { accessToken: string; user: CurrentUser };
export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { token: string; password: string };
export type ChangePasswordRequest = { currentPassword: string; newPassword: string };

export type UpdateProfileRequest = Partial<
  Pick<CurrentUser, "name" | "username" | "status" | "avatarUrl">
> & { notifications?: Partial<NotificationSettings> };

export type UserSearchParams = PageParams & { search?: string };

export type CreateChatRequest =
  | { type: "direct"; memberIds: [ID] }
  | { type: "group"; memberIds: ID[]; name: string; avatarUrl?: string | null };

export type UpdateChatRequest = Partial<
  Pick<Chat, "name" | "avatarUrl" | "pinned" | "muted" | "archived">
>;

export type MessageListParams = PageParams & {
  /** Only messages created strictly after this timestamp (used for re-sync after reconnect). */
  after?: ISODate;
};

export type SendMessageRequest = { tempId: string; body: string; attachments?: Attachment[] };

/* ── Realtime payloads (see src/realtime/events.ts) ─────────────────────── */

export type SendMessagePayload = SendMessageRequest & { chatId: ID };
export type TypingPayload = { chatId: ID; userId: ID; isTyping: boolean };
export type ChatRefPayload = { chatId: ID };
export type ReadPayload = { chatId: ID; messageId: ID };
export type MessageAckPayload = { tempId: string; message: Message };
export type MessageStatusPayload = { chatId: ID; messageId: ID; status: MessageStatus };
export type MessageErrorPayload = { tempId: string; error: ApiErrorBody };
export type PresencePayload = { userId: ID; online: boolean; lastSeenAt: ISODate | null };

/* ── Errors ─────────────────────────────────────────────────────────────── */

/** Standard error body: `{ "error": { code, message, fields } }`. */
export type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};
