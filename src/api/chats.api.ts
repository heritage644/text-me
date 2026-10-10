import type { Attachment, Chat, CreateChatRequest, Page, PageParams, UpdateChatRequest } from "../types/types";
import { http } from "./client";
import { endpoints } from "./endpoints";
import { toAttachment, toChat, toPage, unwrap } from "./normalize";

/** GET /chats?cursor=&limit= → Page<Chat>, pinned first then most recent activity. Archived chats excluded. */
export async function listChats({ cursor, limit = 30 }: PageParams = {}): Promise<Page<Chat>> {
  return toPage(await http.get(endpoints.chats.list, { query: { cursor, limit } }), toChat);
}

/** GET /chats/:id → Chat. Errors: 404. */
export async function getChat(chatId: string): Promise<Chat> {
  return toChat(unwrap(await http.get(endpoints.chats.detail(chatId))));
}

/** POST /chats → Chat. Direct chats are idempotent: returns the existing chat if there is one. */
export async function createChat(body: CreateChatRequest): Promise<Chat> {
  return toChat(unwrap(await http.post(endpoints.chats.list, body)));
}

/** PATCH /chats/:id `{ name?, avatarUrl?, pinned?, muted?, archived? }` → Chat. */
export async function updateChat(chatId: string, body: UpdateChatRequest): Promise<Chat> {
  return toChat(unwrap(await http.patch(endpoints.chats.detail(chatId), body)));
}

/** DELETE /chats/:id → 204. Removes the chat for the current user. */
export async function deleteChat(chatId: string): Promise<void> {
  await http.delete(endpoints.chats.detail(chatId));
}

/** POST /chats/:id/members `{ userIds }` → Chat. Groups only. */
export async function addMembers(chatId: string, userIds: string[]): Promise<Chat> {
  return toChat(unwrap(await http.post(endpoints.chats.members(chatId), { userIds })));
}

/** DELETE /chats/:id/members/:userId → 204. Passing your own id leaves the group. */
export async function removeMember(chatId: string, userId: string): Promise<void> {
  await http.delete(endpoints.chats.member(chatId, userId));
}

/** POST /chats/:id/read `{ messageId }` → 204. Marks everything up to messageId as read. */
export async function markRead(chatId: string, messageId: string): Promise<void> {
  await http.post(endpoints.chats.read(chatId), { messageId });
}

/** GET /chats/:id/media?cursor=&limit= → Page<Attachment>, newest first. */
export async function listMedia(chatId: string, { cursor, limit = 30 }: PageParams = {}): Promise<Page<Attachment>> {
  return toPage(await http.get(endpoints.chats.media(chatId), { query: { cursor, limit } }), toAttachment);
}
