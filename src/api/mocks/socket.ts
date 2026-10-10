/**
 * Fake realtime server. Implements the same transport interface as the real
 * WebSocket so `realtime/socket.ts` (auth, heartbeat, backoff) runs unchanged.
 * Simulates acks, delivery/read receipts, replies with typing, and presence.
 */
import type { Frame, SocketTransport, TransportHandlers } from "../../realtime/socket";
import type { Message, SendMessagePayload } from "../../types/types";
import { db, ME_ID } from "./db";
import { isTokenValid } from "./session";

const REPLIES = [
  "Haha true",
  "Ok, no wahala 👍",
  "Wait, for real?",
  "I'm coming now",
  "Let me check",
  "Sounds good!",
  "Abeg send am again, e no show",
  "😂😂",
  "Talk later, I'm in a meeting",
  "Yes o!",
];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Authenticated connections (normally one; StrictMode or reconnects can briefly overlap). */
const connections = new Set<MockSocketTransport>();

/** Called by the REST handler so messages sent over HTTP also get receipts/replies. */
export function notifyServerMessage(message: Message) {
  connections.forEach((c) => c.simulateConversation(message));
}

export class MockSocketTransport implements SocketTransport {
  private handlers: TransportHandlers | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  connect(_url: string, handlers: TransportHandlers) {
    this.handlers = handlers;
    this.later(() => handlers.onOpen(), 150);
  }

  send(frame: Frame) {
    this.later(() => this.receive(frame), 40);
  }

  close() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.handlers = null;
    connections.delete(this);
  }

  private push(event: string, data?: unknown) {
    this.handlers?.onFrame({ event, data });
  }

  private later(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  private receive({ event, data }: Frame) {
    switch (event) {
      case "auth": {
        const token = (data as { token?: string } | undefined)?.token;
        if (!isTokenValid(token)) return this.push("auth:error", { code: "TOKEN_EXPIRED" });
        connections.add(this);
        this.push("auth:ok");
        this.scheduleAmbient();
        return;
      }
      case "ping":
        return this.push("pong");
      case "message:send":
        return this.handleSend(data as SendMessagePayload);
      case "message:read": {
        const chat = db.chats.get((data as { chatId: string }).chatId);
        if (chat) Object.assign(chat, { unreadCount: 0, mentionCount: 0 });
        return;
      }
    }
  }

  private handleSend({ tempId, chatId, body, attachments }: SendMessagePayload) {
    if (!db.chats.has(chatId)) {
      return this.push("message:error", { tempId, error: { code: "NOT_FOUND", message: "Chat not found." } });
    }
    // Type "/fail" in a message to preview the failed state and retry action.
    if (body.includes("/fail")) {
      return this.later(() => this.push("message:error", { tempId, error: { code: "REJECTED", message: "Message could not be delivered." } }), 700);
    }
    const message = db.addMessage(chatId, ME_ID, body, attachments, tempId);
    this.later(() => this.push("message:ack", { tempId, message: { ...message } }), 300);
    this.simulateConversation(message);
  }

  /** Delivery + read receipts, then (sometimes) a typed reply. */
  simulateConversation(message: Message) {
    const chat = db.chats.get(message.chatId);
    if (!chat) return;
    const peers = chat.memberIds.filter((id) => id !== ME_ID && db.users.has(id));
    const isBlocked = chat.type === "direct" && peers.some((id) => db.blocked.has(id));
    const setStatus = (status: "delivered" | "read") => {
      message.status = status;
      this.push("message:status", { chatId: chat.id, messageId: message.id, status });
    };

    if (isBlocked) return;
    this.later(() => setStatus("delivered"), 1200);
    if (Math.random() > 0.7) return;

    const responder = pick(peers);
    this.later(() => {
      setStatus("read");
      this.push("typing", { chatId: chat.id, userId: responder, isTyping: true });
    }, 2200);
    this.later(() => this.deliverIncoming(chat.id, responder, pick(REPLIES)), 4200 + Math.random() * 1500);
  }

  private deliverIncoming(chatId: string, senderId: string, body: string) {
    if (!db.chats.has(chatId)) return;
    const reply = db.addMessage(chatId, senderId, body);
    this.push("typing", { chatId, userId: senderId, isTyping: false });
    this.push("message:new", { ...reply });
  }

  /** Background activity: random presence changes and incoming messages. */
  private scheduleAmbient() {
    this.later(() => {
      const others = [...db.users.values()].filter((u) => u.id !== ME_ID);
      if (Math.random() < 0.5) {
        const user = pick(others);
        user.online = !user.online;
        user.lastSeenAt = user.online ? null : new Date().toISOString();
        this.push("presence", { userId: user.id, online: user.online, lastSeenAt: user.lastSeenAt });
      } else {
        const chat = pick([...db.chats.values()].filter((c) => c.memberIds.length > 1));
        const sender = chat && pick(chat.memberIds.filter((id) => id !== ME_ID));
        if (sender && !db.blocked.has(sender)) {
          this.push("typing", { chatId: chat.id, userId: sender, isTyping: true });
          this.later(() => this.deliverIncoming(chat.id, sender, pick(REPLIES)), 2500);
        }
      }
      this.scheduleAmbient();
    }, 20_000 + Math.random() * 15_000);
  }
}
