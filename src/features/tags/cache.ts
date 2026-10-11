/**
 * Cache helpers for the current user's tag list (`["tags"]`) and the per-tag
 * message searches (`["tagged-messages", tagId, chatId]`).
 *
 * Message-level tag edits live in `features/thread/cache.ts`, which owns the
 * message pages.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { Tag } from "../../types/types";

export const tagKeys = {
  list: ["tags"] as const,
  /** One tag's message search. `chatId` is `"all"` when the search spans every chat. */
  messages: (tagId: string, chatId?: string | null) => ["tagged-messages", tagId, chatId ?? "all"] as const,
  /** Every tag search, whatever the tag or chat. */
  anyMessages: ["tagged-messages"] as const,
};

/** Insert or replace a tag, keeping the list in the order the server returned it. */
export function upsertTag(qc: QueryClient, tag: Tag) {
  qc.setQueryData<Tag[]>(tagKeys.list, (tags) => {
    if (!tags) return tags;
    return tags.some((t) => t.id === tag.id) ? tags.map((t) => (t.id === tag.id ? tag : t)) : [...tags, tag];
  });
}

export function removeTag(qc: QueryClient, tagId: string) {
  qc.setQueryData<Tag[]>(tagKeys.list, (tags) => tags?.filter((t) => t.id !== tagId));
  // Its search results are meaningless now; drop them so a stale list can't be shown.
  qc.removeQueries({ queryKey: tagKeys.messages(tagId) });
}

export function findTag(qc: QueryClient, tagId: string): Tag | undefined {
  return qc.getQueryData<Tag[]>(tagKeys.list)?.find((t) => t.id === tagId);
}
