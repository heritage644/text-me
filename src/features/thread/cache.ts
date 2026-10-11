/**
 * Helpers over the cursor-paginated message cache. Pages are stored newest
 * first (page 0 = latest messages), exactly as the API returns them.
 */
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Message, MessageStatus, Page, Tag } from "../../types/types";

export const messageKeys = {
  list: (chatId: string) => ["messages", chatId] as const,
  /** Every thread, whatever the chat. */
  anyList: ["messages"] as const,
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

/* ── Tags ─────────────────────────────────────────────────────────────────── */

/** Every message page in the cache: all threads, plus the tag-filtered searches. */
const MESSAGE_PAGE_KEYS: readonly (readonly unknown[])[] = [["messages"], ["tagged-messages"]];

/**
 * Rewrite every cached message. Returning `null` drops the message from the
 * list, which is how a tag-filtered search forgets a message that lost its tag.
 */
function mapCachedMessages(qc: QueryClient, fn: (message: Message) => Message | null) {
  for (const queryKey of MESSAGE_PAGE_KEYS) {
    qc.setQueriesData<MessagePages>({ queryKey }, (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.flatMap((m) => {
                const next = fn(m);
                return next ? [next] : [];
              }),
            })),
          }
        : data,
    );
  }
}

export function findMessage(qc: QueryClient, target: { chatId: string; id: string; tempId?: string }): Message | undefined {
  return qc
    .getQueryData<MessagePages>(messageKeys.list(target.chatId))
    ?.pages.flatMap((p) => p.items)
    .find((m) => matches(m, target));
}

/** Replace one message's tags everywhere it is cached. Returns the updated copy. */
export function setMessageTags(qc: QueryClient, target: { chatId: string; id: string; tempId?: string }, tags: Tag[]) {
  let updated: Message | undefined;
  mapCachedMessages(qc, (m) => {
    if (m.chatId !== target.chatId || !matches(m, target)) return m;
    updated = { ...m, tags };
    return updated;
  });
  return updated;
}

/** A tag was renamed or recoloured: reflect it on every message that carries it. */
export function replaceTagInMessages(qc: QueryClient, tag: Tag) {
  mapCachedMessages(qc, (m) => (m.tags.some((t) => t.id === tag.id) ? { ...m, tags: m.tags.map((t) => (t.id === tag.id ? tag : t)) } : m));
}

/** A tag was deleted: strip it from messages, and drop its own search results. */
export function removeTagFromMessages(qc: QueryClient, tagId: string) {
  qc.removeQueries({ queryKey: ["tagged-messages", tagId] });
  mapCachedMessages(qc, (m) => (m.tags.some((t) => t.id === tagId) ? { ...m, tags: m.tags.filter((t) => t.id !== tagId) } : m));
}
