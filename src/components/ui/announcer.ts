import { create } from "zustand";

export const useAnnouncer = create<{ message: string }>(() => ({ message: "" }));

/** Announce text to screen readers (e.g. incoming messages) without moving focus. */
export function announce(message: string) {
  // Clear first so repeating the same text is still announced.
  useAnnouncer.setState({ message: "" });
  requestAnimationFrame(() => useAnnouncer.setState({ message }));
}
