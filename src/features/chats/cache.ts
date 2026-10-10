/**
 * Helpers that keep the chat list cache (`["chats"]`) and per-chat cache
 * (`["chat", id]`) in sync for optimistic updates and realtime events.
 */
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Chat, Message, Page } from "../../types/types";

export const chatKeys = {
  list: ["chats"] as const,
  detail: (chatId: string) => ["chat", chatId] as const,
};

type ChatPages = InfiniteData<Page<Chat>, string | null>;

function mapChats(data: ChatPages | undefined, fn: (items: Chat[]) => Chat[]): ChatPages | undefined {
  return data && { ...data, pages: data.pages.map((p) => ({ ...p, items: fn(p.items) })) };
}

export function findChat(qc: QueryClient, chatId: string): Chat | undefined {
  return (
    qc.getQueryData<Chat>(chatKeys.detail(chatId)) ??
    qc.getQueryData<ChatPages>(chatKeys.list)?.pages.flatMap((p) => p.items).find((c) => c.id === chatId)
  );
}

export function patchChat(qc: QueryClient, chatId: string, update: (chat: Chat) => Chat) {
  qc.setQueryData<ChatPages>(chatKeys.list, (data) => mapChats(data, (items) => items.map((c) => (c.id === chatId ? update(c) : c))));
  qc.setQueryData<Chat>(chatKeys.detail(chatId), (chat) => chat && update(chat));
}

export function upsertChat(qc: QueryClient, chat: Chat) {
  qc.setQueryData<ChatPages>(chatKeys.list, (data) => {
    if (!data) return data;
    if (data.pages.some((p) => p.items.some((c) => c.id === chat.id))) {
      return mapChats(data, (items) => items.map((c) => (c.id === chat.id ? chat : c)));
    }
    const [first, ...rest] = data.pages;
    return { ...data, pages: [{ ...first, items: [chat, ...first.items] }, ...rest] };
  });
  qc.setQueryData(chatKeys.detail(chat.id), chat);
}

export function removeChat(qc: QueryClient, chatId: string) {
  qc.setQueryData<ChatPages>(chatKeys.list, (data) => mapChats(data, (items) => items.filter((c) => c.id !== chatId)));
  qc.removeQueries({ queryKey: chatKeys.detail(chatId) });
  qc.removeQueries({ queryKey: ["messages", chatId] });
}

const sameMessage = (a: Message, b: Message) => a.id === b.id || (!!a.tempId && a.tempId === b.tempId);

/** Reflects a new/updated message in the chat row (preview, ordering, unread counts). */
export function applyMessageToChat(qc: QueryClient, message: Message, counts: { unread?: number; mentions?: number } = {}) {
  if (!findChat(qc, message.chatId)) {
    // A chat we haven't loaded yet (e.g. someone started a new conversation).
    void qc.invalidateQueries({ queryKey: chatKeys.list });
    return;
  }
  patchChat(qc, message.chatId, (chat) => {
    const current = chat.lastMessage;
    const replaces = current && sameMessage(current, message);
    const isNewer = !current || message.createdAt >= current.createdAt;
    return {
      ...chat,
      lastMessage: replaces || isNewer ? message : current,
      updatedAt: isNewer ? message.createdAt : chat.updatedAt,
      archived: false,
      unreadCount: chat.unreadCount + (counts.unread ?? 0),
      mentionCount: chat.mentionCount + (counts.mentions ?? 0),
    };
  });
}

export function clearUnread(qc: QueryClient, chatId: string) {
  patchChat(qc, chatId, (chat) => (chat.unreadCount || chat.mentionCount ? { ...chat, unreadCount: 0, mentionCount: 0 } : chat));
}

/** Pinned first, then most recent activity. */
export function sortChats(chats: Chat[]) {
  const activity = (c: Chat) => c.lastMessage?.createdAt ?? c.updatedAt;
  return [...chats].sort((a, b) => Number(b.pinned) - Number(a.pinned) || activity(b).localeCompare(activity(a)));
}

/** Patch every cached chat matching `predicate` (e.g. all chats with a user who was just blocked). */
export function patchChatsWhere(qc: QueryClient, predicate: (chat: Chat) => boolean, update: (chat: Chat) => Chat) {
  qc.setQueryData<ChatPages>(chatKeys.list, (data) => mapChats(data, (items) => items.map((c) => (predicate(c) ? update(c) : c))));
  qc.setQueriesData<Chat>({ queryKey: ["chat"] }, (chat) => (chat && predicate(chat) ? update(chat) : chat));
}
