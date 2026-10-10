import type { Message, MessageListParams, Page, SendMessageRequest } from "../types/types";
import { http } from "./client";
import { endpoints } from "./endpoints";
import { toMessage, toPage, unwrap } from "./normalize";

/**
 * GET /chats/:id/messages?cursor=&limit=&after= → Page<Message>.
 * Items are newest first; `nextCursor` points to older messages.
 * `after` (ISO date) returns only messages newer than that, for re-sync after a reconnect.
 */
export async function listMessages(chatId: string, { cursor, limit = 30, after }: MessageListParams = {}): Promise<Page<Message>> {
  return toPage(await http.get(endpoints.chats.messages(chatId), { query: { cursor, limit, after } }), toMessage);
}

/**
 * POST /chats/:id/messages `{ tempId, body, attachments? }` → Message (with `tempId` echoed).
 * REST fallback used when the socket is disconnected; the server should de-duplicate on `tempId`.
 */
export async function sendMessage(chatId: string, body: SendMessageRequest): Promise<Message> {
  return toMessage(unwrap(await http.post(endpoints.chats.messages(chatId), body)));
}

/** PATCH /messages/:id `{ body }` → Message. Sender only. */
export async function editMessage(messageId: string, body: string): Promise<Message> {
  return toMessage(unwrap(await http.patch(endpoints.messages.detail(messageId), { body })));
}

/** DELETE /messages/:id → 204. Sender only. */
export async function deleteMessage(messageId: string): Promise<void> {
  await http.delete(endpoints.messages.detail(messageId));
}
