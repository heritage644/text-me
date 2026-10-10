import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ServerEventName } from "./events";
import { socket } from "./socket";

/** Subscribe to a realtime event for the lifetime of the component. The handler may change freely. */
export function useSocketEvent<T = unknown>(event: ServerEventName, handler: (data: T) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => socket.on(event, (data) => ref.current(data as T)), [event]);
}

export function useConnectionState() {
  return useSyncExternalStore(socket.subscribeState, socket.getState, socket.getState);
}
