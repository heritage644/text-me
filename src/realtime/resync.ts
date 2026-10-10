import type { QueryClient } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { chatKeys } from "../features/chats/cache";
import { tagKeys } from "../features/tags/cache";
import { latestConfirmedAt, messageKeys, upsertMessage } from "../features/thread/cache";

const RESYNC_LIMIT = 100;

/**
 * After a reconnect: refresh the chat list and fetch messages created after the
 * newest one we already have, for every thread in the cache. If the gap is too
 * large, that thread is simply reloaded from scratch.
 */
export async function resync(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: chatKeys.list });
  // Tags are cached with `staleTime: Infinity`; a reconnect may have missed tag events.
  void qc.invalidateQueries({ queryKey: tagKeys.list });
  const threads = qc.getQueryCache().findAll({ queryKey: ["messages"] });

  await Promise.all(
    threads.map(async (query) => {
      const chatId = String(query.queryKey[1]);
      const after = latestConfirmedAt(qc, chatId);
      if (!after) return;
      try {
        const page = await messagesApi.listMessages(chatId, { after, limit: RESYNC_LIMIT });
        if (page.nextCursor) {
          await qc.resetQueries({ queryKey: messageKeys.list(chatId) });
          return;
        }
        // Oldest first, so each insert at the head leaves the newest on top.
        [...page.items].reverse().forEach((m) => upsertMessage(qc, m));
      } catch {
        // Next reconnect (or opening the chat) will try again.
      }
    }),
  );
}
