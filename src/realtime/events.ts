import type { ChatRefPayload, ReadPayload, SendMessagePayload } from "../types/types";

/** client → server */
export const ClientEvent = {
  MessageSend: "message:send",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  MessageRead: "message:read",
} as const;

/** server → client (payloads are normalised in RealtimeProvider via api/normalize.ts) */
export const ServerEvent = {
  MessageNew: "message:new",
  MessageAck: "message:ack",
  MessageStatus: "message:status",
  MessageError: "message:error",
  Typing: "typing",
  Presence: "presence",
  ChatUpdated: "chat:updated",
} as const;

/** Connection control frames handled inside socket.ts. */
export const ControlEvent = {
  Auth: "auth",
  AuthOk: "auth:ok",
  AuthError: "auth:error",
  Ping: "ping",
  Pong: "pong",
} as const;

/** Emitted locally by the socket client, never sent over the wire. */
export const LocalEvent = {
  /** Fired after a successful *re*connect: refetch anything missed while offline. */
  Resync: "client:resync",
} as const;

export type ClientEventMap = {
  [ClientEvent.MessageSend]: SendMessagePayload;
  [ClientEvent.TypingStart]: ChatRefPayload;
  [ClientEvent.TypingStop]: ChatRefPayload;
  [ClientEvent.MessageRead]: ReadPayload;
};

export type ClientEventName = keyof ClientEventMap;
export type ServerEventName = (typeof ServerEvent)[keyof typeof ServerEvent] | (typeof LocalEvent)[keyof typeof LocalEvent];
