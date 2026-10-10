/** Route handlers implementing docs/API_CONTRACT.md against the in-memory db. */
import type { ApiErrorBody, Attachment } from "../../types/types";
import { db, ME_ID, nextId } from "./db";
import { issueToken, SESSION_KEY } from "./session";
import { notifyServerMessage } from "./socket";

// Request bodies are untrusted JSON, as on a real server.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

export type MockRequest = {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Body;
  form: FormData | null;
};
export type MockResult = { status: number; body?: unknown };
type Handler = (req: MockRequest) => MockResult | Promise<MockResult>;

export type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler; isPublic: boolean };

/* ── Helpers ────────────────────────────────────────────────────────────── */

const ok = (body?: unknown, status = 200): MockResult => ({ status: body === undefined ? 204 : status, body });
const fail = (status: number, code: string, message: string, fields?: ApiErrorBody["fields"]): MockResult => ({
  status,
  body: { error: { code, message, ...(fields ? { fields } : {}) } },
});

const encodeCursor = (n: number) => btoa(String(n));
const decodeCursor = (c: string | null) => (c ? Number(atob(c)) : null);

function paginate<T>(items: T[], query: URLSearchParams) {
  const limit = Number(query.get("limit") ?? 30);
  const start = decodeCursor(query.get("cursor")) ?? 0;
  const end = start + limit;
  return { items: items.slice(start, end), nextCursor: end < items.length ? encodeCursor(end) : null };
}

function startSession() {
  sessionStorage.setItem(SESSION_KEY, ME_ID);
  return { accessToken: issueToken(), user: db.me() };
}

function chatOr404(id: string) {
  const chat = db.chats.get(id);
  return chat && chat.memberIds.includes(ME_ID) ? chat : null;
}

function validateAuthFields(body: Body, fields: string[]) {
  const errors: Record<string, string> = {};
  if (fields.includes("email") && !/^\S+@\S+\.\S+$/.test(body?.email ?? "")) errors.email = "Enter a valid email address.";
  if (fields.includes("password") && String(body?.password ?? "").length < 6) errors.password = "Password must be at least 6 characters.";
  if (fields.includes("username") && !/^[a-z0-9_]{3,20}$/i.test(body?.username ?? ""))
    errors.username = "3–20 letters, numbers or underscores.";
  if (fields.includes("name") && String(body?.name ?? "").trim().length < 2) errors.name = "Enter your name.";
  return Object.keys(errors).length ? fail(422, "VALIDATION", "Please check the highlighted fields.", errors) : null;
}

/* ── Routes ─────────────────────────────────────────────────────────────── */

export const routes: Route[] = [];

function route(method: string, path: string, handler: Handler, isPublic = false) {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:(\w+)/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })}$`,
  );
  routes.push({ method, pattern, keys, handler, isPublic });
}

// Auth
route("POST", "/auth/login", ({ body }) => {
  const invalid = validateAuthFields(body, ["email", "password"]);
  if (invalid) return invalid;
  if (body.password === "wrong-password") return fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  return ok(startSession());
}, true);

route("POST", "/auth/register", ({ body }) => {
  const invalid = validateAuthFields(body, ["name", "username", "email", "password"]);
  if (invalid) return invalid;
  if (body.username.toLowerCase() === "taken") return fail(409, "CONFLICT", "That username is taken.", { username: "That username is already taken." });
  if (body.email.toLowerCase().startsWith("taken@")) return fail(409, "CONFLICT", "That email is registered.", { email: "An account with this email already exists." });
  Object.assign(db.users.get(ME_ID)!, { name: body.name.trim(), username: body.username, email: body.email });
  return ok(startSession(), 201);
}, true);

route("POST", "/auth/logout", () => {
  sessionStorage.removeItem(SESSION_KEY);
  return ok();
}, true);

route("POST", "/auth/refresh", () =>
  sessionStorage.getItem(SESSION_KEY) ? ok({ accessToken: issueToken() }) : fail(401, "NO_SESSION", "Not signed in."), true);

route("POST", "/auth/forgot-password", ({ body }) => validateAuthFields(body, ["email"]) ?? ok(), true);

route("POST", "/auth/reset-password", ({ body }) => {
  if (body?.token === "expired") return fail(400, "TOKEN_EXPIRED", "This reset link has expired. Request a new one.");
  if (!body?.token) return fail(400, "INVALID_TOKEN", "This reset link is invalid.");
  return validateAuthFields(body, ["password"]) ?? ok();
}, true);

// Users
route("GET", "/users/me", () => ok(db.me()));

route("PATCH", "/users/me", ({ body }) => {
  const me = db.users.get(ME_ID)!;
  if (body.username !== undefined) {
    const invalid = validateAuthFields(body, ["username"]);
    if (invalid) return invalid;
    const taken = [...db.users.values()].some((u) => u.id !== ME_ID && u.username.toLowerCase() === body.username.toLowerCase());
    if (taken || body.username.toLowerCase() === "taken") return fail(409, "CONFLICT", "That username is taken.", { username: "That username is already taken." });
  }
  if (body.name !== undefined && !String(body.name).trim()) return fail(422, "VALIDATION", "Name is required.", { name: "Enter your name." });
  const { notifications, ...rest } = body;
  Object.assign(me, rest);
  if (notifications) me.notifications = { ...me.notifications, ...notifications };
  return ok(db.me());
});

route("POST", "/users/me/password", ({ body }) => {
  if (body.currentPassword === "wrong-password") return fail(422, "VALIDATION", "Current password is incorrect.", { currentPassword: "That's not your current password." });
  if (String(body.newPassword ?? "").length < 6) return fail(422, "VALIDATION", "Password too short.", { newPassword: "Password must be at least 6 characters." });
  return ok();
});

route("GET", "/users", ({ query }) => {
  const q = (query.get("search") ?? "").trim().toLowerCase();
  const list = [...db.users.values()]
    .filter((u) => u.id !== ME_ID && (!q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => db.publicUser(u.id));
  return ok(paginate(list, query));
});

route("POST", "/users/:id/block", ({ params }) => {
  db.blocked.add(params.id);
  return ok();
});
route("DELETE", "/users/:id/block", ({ params }) => {
  db.blocked.delete(params.id);
  return ok();
});

// Chats
route("GET", "/chats", ({ query }) => {
  const list = [...db.chats.values()]
    .filter((c) => c.memberIds.includes(ME_ID) && !c.archived)
    .map((c) => db.serializeChat(c))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.lastMessage?.createdAt ?? b.updatedAt).localeCompare(a.lastMessage?.createdAt ?? a.updatedAt));
  return ok(paginate(list, query));
});

route("POST", "/chats", ({ body }) => {
  const memberIds: string[] = body.memberIds ?? [];
  if (!memberIds.length || memberIds.some((id) => !db.users.has(id))) return fail(422, "VALIDATION", "Pick at least one valid member.", { memberIds: "Pick at least one member." });
  if (body.type === "direct") {
    const existing = [...db.chats.values()].find((c) => c.type === "direct" && c.memberIds.includes(memberIds[0]) && c.memberIds.includes(ME_ID));
    if (existing) {
      existing.archived = false;
      return ok(db.serializeChat(existing));
    }
    return ok(db.serializeChat(db.createChat({ type: "direct", memberIds })), 201);
  }
  if (!String(body.name ?? "").trim()) return fail(422, "VALIDATION", "Group name is required.", { name: "Give your group a name." });
  return ok(db.serializeChat(db.createChat({ type: "group", memberIds, name: body.name.trim(), avatarUrl: body.avatarUrl })), 201);
});

route("GET", "/chats/:id", ({ params }) => {
  const chat = chatOr404(params.id);
  return chat ? ok(db.serializeChat(chat)) : fail(404, "NOT_FOUND", "Chat not found.");
});

route("PATCH", "/chats/:id", ({ params, body }) => {
  const chat = chatOr404(params.id);
  if (!chat) return fail(404, "NOT_FOUND", "Chat not found.");
  for (const key of ["name", "avatarUrl", "pinned", "muted", "archived"] as const) {
    if (body[key] !== undefined) Object.assign(chat, { [key]: body[key] });
  }
  return ok(db.serializeChat(chat));
});

route("DELETE", "/chats/:id", ({ params }) => {
  if (!chatOr404(params.id)) return fail(404, "NOT_FOUND", "Chat not found.");
  db.chats.delete(params.id);
  db.messages.delete(params.id);
  return ok();
});

route("POST", "/chats/:id/members", ({ params, body }) => {
  const chat = chatOr404(params.id);
  if (!chat) return fail(404, "NOT_FOUND", "Chat not found.");
  if (chat.type !== "group") return fail(400, "NOT_A_GROUP", "You can only add members to groups.");
  for (const id of body.userIds ?? []) if (db.users.has(id) && !chat.memberIds.includes(id)) chat.memberIds.push(id);
  return ok(db.serializeChat(chat));
});

route("DELETE", "/chats/:id/members/:userId", ({ params }) => {
  const chat = chatOr404(params.id);
  if (!chat) return fail(404, "NOT_FOUND", "Chat not found.");
  chat.memberIds = chat.memberIds.filter((id) => id !== params.userId);
  return ok();
});

route("GET", "/chats/:id/messages", ({ params, query }) => {
  const list = db.messages.get(params.id);
  if (!list || !chatOr404(params.id)) return fail(404, "NOT_FOUND", "Chat not found.");
  const limit = Number(query.get("limit") ?? 30);
  const after = query.get("after");
  if (after) {
    const newer = list.filter((m) => m.createdAt > after).reverse();
    return ok({ items: newer.slice(0, limit), nextCursor: newer.length > limit ? "gap" : null });
  }
  const end = decodeCursor(query.get("cursor")) ?? list.length;
  const start = Math.max(0, end - limit);
  return ok({ items: list.slice(start, end).reverse(), nextCursor: start > 0 ? encodeCursor(start) : null });
});

route("POST", "/chats/:id/messages", ({ params, body }) => {
  const chat = chatOr404(params.id);
  if (!chat) return fail(404, "NOT_FOUND", "Chat not found.");
  if (!String(body.body ?? "").trim() && !body.attachments?.length) return fail(422, "VALIDATION", "Message is empty.", { body: "Type a message." });
  if (String(body.body).includes("/fail")) return fail(500, "INTERNAL", "Message could not be delivered.");
  const message = db.addMessage(chat.id, ME_ID, body.body, body.attachments ?? [], body.tempId);
  notifyServerMessage(message);
  return ok(message, 201);
});

route("POST", "/chats/:id/read", ({ params }) => {
  const chat = chatOr404(params.id);
  if (!chat) return fail(404, "NOT_FOUND", "Chat not found.");
  chat.unreadCount = 0;
  chat.mentionCount = 0;
  return ok();
});

route("GET", "/chats/:id/media", ({ params, query }) => {
  const list = db.messages.get(params.id);
  if (!list) return fail(404, "NOT_FOUND", "Chat not found.");
  const media = list.flatMap((m) => m.attachments).reverse();
  return ok(paginate(media, query));
});

// Messages
route("PATCH", "/messages/:id", ({ params, body }) => {
  const found = db.findMessage(params.id);
  if (!found) return fail(404, "NOT_FOUND", "Message not found.");
  if (found.message.senderId !== ME_ID) return fail(403, "FORBIDDEN", "You can only edit your own messages.");
  Object.assign(found.message, { body: body.body, editedAt: new Date().toISOString() });
  return ok(found.message);
});

route("DELETE", "/messages/:id", ({ params }) => {
  const found = db.findMessage(params.id);
  if (!found) return fail(404, "NOT_FOUND", "Message not found.");
  found.list.splice(found.index, 1);
  return ok();
});

// Uploads
route("POST", "/uploads", ({ form }) => {
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(422, "VALIDATION", "No file provided.", { file: "Choose a file." });
  if (file.size > 25 * 1024 * 1024) return fail(413, "FILE_TOO_LARGE", "Files must be 25 MB or smaller.");
  const attachment: Attachment = {
    id: nextId("att"),
    url: URL.createObjectURL(file),
    mime: file.type || "application/octet-stream",
    size: file.size,
    name: file.name,
    width: form?.get("width") ? Number(form.get("width")) : null,
    height: form?.get("height") ? Number(form.get("height")) : null,
  };
  return ok(attachment, 201);
});
