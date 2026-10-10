/** Ack timeouts for messages sent over the socket, keyed by tempId. */
const ACK_TIMEOUT_MS = 10_000;
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; fail: () => void }>();

/** Marks the message failed (via `fail`) unless an ack arrives within the timeout. */
export function trackPending(tempId: string, fail: () => void) {
  resolvePending(tempId);
  const timer = setTimeout(() => failPending(tempId), ACK_TIMEOUT_MS);
  pending.set(tempId, { timer, fail });
}

/** Ack received: stop waiting. */
export function resolvePending(tempId: string) {
  const entry = pending.get(tempId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(tempId);
}

/** Server rejected the message (or it timed out): mark it failed now. */
export function failPending(tempId: string) {
  const entry = pending.get(tempId);
  resolvePending(tempId);
  entry?.fail();
}
