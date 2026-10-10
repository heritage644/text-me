import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { refreshAccessToken, tokens } from "../api/client";
import { toChat, toMessage } from "../api/normalize";
import { announce } from "../components/ui/announcer";
import { env } from "../lib/env";
import { useSession } from "../features/auth/session-store";
import { applyMessageToChat, findChat, upsertChat } from "../features/chats/cache";
import { firstName, attachmentLabel } from "../features/chats/utils";
import { setMessageStatus, upsertMessage } from "../features/thread/cache";
import { failPending, resolvePending } from "../features/thread/send-tracker";
import type { MessageStatus, PresencePayload, TypingPayload } from "../types/types";
import { LocalEvent, ServerEvent } from "./events";
import { useRealtimeStore } from "./presence-store";
import { resync } from "./resync";
import { socket } from "./socket";
import { useSocketEvent } from "./use-socket-event";

// Server payloads are normalised through api/normalize.ts before touching the cache.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/** Connects the socket while signed in and applies every server event to the query cache. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const status = useSession((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated") return;
    const url = env.useMocks ? "mock://realtime" : env.wsUrl;
    if (!url) {
      console.warn("[Text-ME] VITE_WS_URL is not set; realtime updates are disabled.");
      return;
    }
    socket.start({ url, getToken: tokens.get, refreshToken: refreshAccessToken });
    return () => socket.stop();
  }, [status]);

  useSocketEvent<Raw>(ServerEvent.MessageNew, (raw) => {
    const me = useSession.getState().user;
    if (!me) return;
    const message = toMessage(raw);
    const isOwn = message.senderId === me.id;
    const viewing = useRealtimeStore.getState().activeChatId === message.chatId && document.visibilityState === "visible";
    const mentioned = !isOwn && message.body.includes(`@${me.username}`);

    upsertMessage(qc, message);
    applyMessageToChat(qc, message, { unread: isOwn || viewing ? 0 : 1, mentions: mentioned && !viewing ? 1 : 0 });
    useRealtimeStore.getState().setTyping(message.chatId, message.senderId, false);

    if (viewing && !isOwn) {
      const sender = findChat(qc, message.chatId)?.members.find((m) => m.id === message.senderId);
      announce(`${sender ? firstName(sender.name) : "New message"}: ${message.body || attachmentLabel(message.attachments)}`);
    }
  });

  useSocketEvent<Raw>(ServerEvent.MessageAck, ({ tempId, message: raw }) => {
    resolvePending(tempId);
    const message = { ...toMessage(raw), tempId };
    upsertMessage(qc, message);
    applyMessageToChat(qc, message);
  });

  useSocketEvent<{ chatId: string; messageId: string; status: MessageStatus }>(ServerEvent.MessageStatus, ({ chatId, messageId, status }) => {
    const updated = setMessageStatus(qc, chatId, { id: messageId }, status);
    if (updated) applyMessageToChat(qc, updated);
  });

  useSocketEvent<{ tempId: string }>(ServerEvent.MessageError, ({ tempId }) => failPending(tempId));

  useSocketEvent<TypingPayload>(ServerEvent.Typing, ({ chatId, userId, isTyping }) => {
    if (userId !== useSession.getState().user?.id) useRealtimeStore.getState().setTyping(chatId, userId, isTyping);
  });

  useSocketEvent<PresencePayload>(ServerEvent.Presence, ({ userId, online, lastSeenAt }) => {
    useRealtimeStore.getState().setPresence(userId, { online, lastSeenAt });
  });

  useSocketEvent<Raw>(ServerEvent.ChatUpdated, (raw) => upsertChat(qc, toChat(raw)));

  useSocketEvent(LocalEvent.Resync, () => void resync(qc));

  return children;
}
