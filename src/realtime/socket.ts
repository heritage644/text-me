/**
 * Realtime client: auth on connect, heartbeat, exponential backoff with jitter,
 * an event emitter, and a re-sync signal after reconnecting.
 *
 * Wire format (native WebSocket): JSON text frames `{ "event": string, "data"?: any }`.
 * The transport is an interface — implement `SocketTransport` and change
 * `createTransport` below to use Socket.IO (map `emit/onAny` onto `send/onFrame`).
 */
import { ControlEvent, LocalEvent, type ClientEventMap, type ClientEventName, type ServerEventName } from "./events";

export type Frame = { event: string; data?: unknown };

export type TransportHandlers = {
  onOpen: () => void;
  onFrame: (frame: Frame) => void;
  onClose: () => void;
};

export interface SocketTransport {
  connect(url: string, handlers: TransportHandlers): void;
  send(frame: Frame): void;
  close(): void;
}

export class WebSocketTransport implements SocketTransport {
  private ws: WebSocket | null = null;

  connect(url: string, handlers: TransportHandlers) {
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = handlers.onOpen;
    ws.onclose = handlers.onClose;
    ws.onmessage = (e) => {
      try {
        handlers.onFrame(JSON.parse(String(e.data)) as Frame);
      } catch {
        // Ignore malformed frames rather than tearing down the connection.
      }
    };
  }

  send(frame: Frame) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(frame));
  }

  close() {
    if (!this.ws) return;
    this.ws.onclose = null;
    this.ws.close();
    this.ws = null;
  }
}

/** Swap this for another `SocketTransport` implementation (e.g. Socket.IO). */
const createTransport: () => SocketTransport = () => new WebSocketTransport();

export type ConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "offline";

type Config = {
  url: string;
  getToken: () => string | null;
  /** Called when the server rejects the token; should resolve with a fresh one. */
  refreshToken: () => Promise<string>;
};

type Handler = (data: unknown) => void;

const HEARTBEAT_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 30_000;

class RealtimeClient {
  private config: Config | null = null;
  private transport: SocketTransport | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private stateListeners = new Set<() => void>();
  private state: ConnectionState = "idle";
  private attempt = 0;
  private hasConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private pongTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.config && this.state !== "open" && this.reconnectNow());
      window.addEventListener("offline", () => this.config && this.dropConnection("offline"));
    }
  }

  /** Connect (after login). Safe to call repeatedly. */
  start(config: Config) {
    if (this.config) return;
    this.config = config;
    this.hasConnected = false;
    this.attempt = 0;
    this.open();
  }

  /** Disconnect (on logout) and stop reconnecting. */
  stop() {
    this.config = null;
    this.teardown();
    this.setState("idle");
  }

  getState = () => this.state;

  subscribeState = (listener: () => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  /** Subscribe to a server or local event. Returns an unsubscribe function. */
  on(event: ServerEventName, handler: Handler) {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  /** Send an event. Returns `false` when not connected so callers can fall back to REST. */
  emit<E extends ClientEventName>(event: E, data: ClientEventMap[E]): boolean {
    if (this.state !== "open" || !this.transport) return false;
    this.transport.send({ event, data });
    return true;
  }

  private dispatch(event: string, data: unknown) {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  private setState(next: ConnectionState) {
    if (this.state === next) return;
    this.state = next;
    this.stateListeners.forEach((l) => l());
  }

  private open() {
    const config = this.config;
    if (!config) return;
    if (!navigator.onLine) return this.setState("offline");

    this.setState(this.hasConnected ? "reconnecting" : "connecting");
    const transport = createTransport();
    this.transport = transport;
    transport.connect(config.url, {
      onOpen: () => transport.send({ event: ControlEvent.Auth, data: { token: config.getToken() } }),
      onFrame: (frame) => this.handleFrame(frame),
      onClose: () => this.dropConnection(),
    });
  }

  private handleFrame({ event, data }: Frame) {
    switch (event) {
      case ControlEvent.AuthOk: {
        const isReconnect = this.hasConnected;
        this.attempt = 0;
        this.hasConnected = true;
        this.setState("open");
        this.startHeartbeat();
        if (isReconnect) this.dispatch(LocalEvent.Resync, null);
        return;
      }
      case ControlEvent.AuthError:
        this.teardown();
        this.config
          ?.refreshToken()
          .then(() => this.reconnectNow())
          .catch(() => this.stop());
        return;
      case ControlEvent.Pong:
        clearTimeout(this.pongTimer);
        return;
      default:
        this.dispatch(event, data);
    }
  }

  private startHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.transport?.send({ event: ControlEvent.Ping });
      clearTimeout(this.pongTimer);
      this.pongTimer = setTimeout(() => this.dropConnection(), PONG_TIMEOUT_MS);
    }, HEARTBEAT_MS);
  }

  private teardown() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
    this.transport?.close();
    this.transport = null;
  }

  private dropConnection(nextState: ConnectionState = "reconnecting") {
    this.teardown();
    if (!this.config) return;
    if (nextState === "offline" || !navigator.onLine) return this.setState("offline");
    this.setState("reconnecting");
    // "Full jitter" backoff: random delay in [50%, 100%] of the exponential step.
    const step = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.attempt);
    const delay = step / 2 + Math.random() * (step / 2);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private reconnectNow() {
    this.teardown();
    this.open();
  }
}

export const socket = new RealtimeClient();
