/**
 * Helpers over the cursor-paginated message cache. Pages are stored newest
 * first (page 0 = latest messages), exactly as the API returns them.
 */
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Message, MessageStatus, Page } from "../../types/types";

export const messageKeys = {
  list: (chatId: string) => ["messages", chatId] as const,
};

type MessagePages = InfiniteData<Page<Message>, string | null>;

const STATUS_RANK: Record<MessageStatus, number> = { failed: 0, sending: 1, sent: 2, delivered: 3, read: 4 };

const matches = (m: Message, target: Pick<Message, "id"> & { tempId?: string }) =>
  m.id === target.id || (!!target.tempId && m.tempId === target.tempId);

/** Statuses only move forward (sent → delivered → read), except an explicit retry. */
function merge(existing: Message, incoming: Message): Message {
  const status =
    incoming.status === "sending" || STATUS_RANK[incoming.status] >= STATUS_RANK[existing.status]
      ? incoming.status
      : existing.status;
  return { ...existing, ...incoming, status, tempId: existing.tempId ?? incoming.tempId };
}

/**
 * Insert or update a message, matching on id or tempId. Also removes duplicates,
 * e.g. when `message:new` for our own message races the `message:ack`.
 */
export function upsertMessage(qc: QueryClient, message: Message) {
  qc.setQueryData<MessagePages>(messageKeys.list(message.chatId), (data) => {
    if (!data) return data;
    let found = false;
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((m) => {
        if (!matches(m, message)) return [m];
        if (found) return [];
        found = true;
        return [merge(m, message)];
      }),
    }));
    if (found) return { ...data, pages };
    const [first, ...rest] = pages;
    return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
  });
}

export function setMessageStatus(qc: QueryClient, chatId: string, target: { id: string; tempId?: string }, status: MessageStatus) {
  let updated: Message | undefined;
  qc.setQueryData<MessagePages>(messageKeys.list(chatId), (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => {
          if (!matches(m, target)) return m;
          // "failed" is forced (it's a downgrade from "sending"); everything else only moves forward.
          if (status !== "failed" && STATUS_RANK[status] < STATUS_RANK[m.status]) return m;
          updated = { ...m, status };
          return updated;
        }),
      })),
    };
  });
  return updated;
}

/** createdAt of the newest server-confirmed message, used to re-sync after a reconnect. */
export function latestConfirmedAt(qc: QueryClient, chatId: string) {
  const data = qc.getQueryData<MessagePages>(messageKeys.list(chatId));
  return data?.pages[0]?.items.find((m) => m.status !== "sending" && m.status !== "failed")?.createdAt;
}
