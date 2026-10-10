import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as chatsApi from "../../api/chats.api";
import * as messagesApi from "../../api/messages.api";
import { createTempId } from "../../lib/ids";
import { ClientEvent } from "../../realtime/events";
import { socket } from "../../realtime/socket";
import type { Attachment, Message } from "../../types/types";
import { useCurrentUser } from "../auth/session-store";
import { applyMessageToChat, clearUnread } from "../chats/cache";
import { messageKeys, setMessageStatus, upsertMessage } from "./cache";
import { trackPending } from "./send-tracker";

/** Messages for a chat in chronological order, with upward (older) pagination. */
export function useMessages(chatId: string) {
  const query = useInfiniteQuery({
    queryKey: messageKeys.list(chatId),
    queryFn: ({ pageParam }) => messagesApi.listMessages(chatId, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // The socket keeps this fresh (and re-syncs after reconnects); refetching
    // every loaded page on focus would be wasteful.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const messages = useMemo(() => (query.data ? query.data.pages.flatMap((p) => p.items).reverse() : []), [query.data]);
  return { ...query, messages };
}

type SendInput = { body: string; attachments?: Attachment[]; retryOf?: Message };

/**
 * Optimistic send: the message appears immediately as "sending", is replaced
 * when `message:ack` arrives (see RealtimeProvider), and is marked "failed" on
 * error or ack timeout. Falls back to REST when the socket is down.
 */
export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  const me = useCurrentUser();

  return useCallback(
    ({ body, attachments = [], retryOf }: SendInput) => {
      const tempId = retryOf?.tempId ?? createTempId();
      const optimistic: Message = {
        id: retryOf?.id ?? tempId,
        tempId,
        chatId,
        senderId: me.id,
        body,
        attachments,
        status: "sending",
        createdAt: retryOf?.createdAt ?? new Date().toISOString(),
        editedAt: null,
      };
      upsertMessage(qc, optimistic);
      applyMessageToChat(qc, optimistic);

      const fail = () => {
        const failed = setMessageStatus(qc, chatId, optimistic, "failed");
        if (failed) applyMessageToChat(qc, failed);
      };

      if (socket.emit(ClientEvent.MessageSend, { tempId, chatId, body, attachments })) {
        trackPending(tempId, fail);
        return;
      }
      messagesApi
        .sendMessage(chatId, { tempId, body, attachments })
        .then((message) => {
          const confirmed = { ...message, tempId };
          upsertMessage(qc, confirmed);
          applyMessageToChat(qc, confirmed);
        })
        .catch(fail);
    },
    [qc, chatId, me.id],
  );
}

/** Marks the chat read whenever a newer incoming message is visible. */
export function useMarkRead(chatId: string, messages: Message[], meId: string) {
  const qc = useQueryClient();
  const lastSent = useRef<string | null>(null);
  const lastIncomingId = useMemo(
    () => messages.findLast((m) => m.senderId !== meId && m.status !== "sending")?.id,
    [messages, meId],
  );

  useEffect(() => {
    if (!lastIncomingId) return;
    const markRead = () => {
      if (document.visibilityState !== "visible" || lastSent.current === lastIncomingId) return;
      lastSent.current = lastIncomingId;
      clearUnread(qc, chatId);
      const payload = { chatId, messageId: lastIncomingId };
      if (!socket.emit(ClientEvent.MessageRead, payload)) {
        chatsApi.markRead(chatId, lastIncomingId).catch(() => {
          lastSent.current = null;
        });
      }
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [qc, chatId, lastIncomingId]);
}

const TYPING_IDLE_MS = 3_000;

/** Emits typing:start on input and typing:stop after a pause, on send, or on unmount. */
export function useTypingEmitter(chatId: string) {
  const typing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (!typing.current) return;
    typing.current = false;
    socket.emit(ClientEvent.TypingStop, { chatId });
  }, [chatId]);

  const onInput = useCallback(() => {
    if (!typing.current) typing.current = socket.emit(ClientEvent.TypingStart, { chatId });
    clearTimeout(timer.current);
    timer.current = setTimeout(stop, TYPING_IDLE_MS);
  }, [chatId, stop]);

  useEffect(() => stop, [stop]);
  return { onInput, stop };
}

export function useChatMedia(chatId: string) {
  return useQuery({
    queryKey: ["chat-media", chatId],
    queryFn: () => chatsApi.listMedia(chatId, { limit: 12 }),
  });
}
