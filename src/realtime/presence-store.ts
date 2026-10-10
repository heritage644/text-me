import { create } from "zustand";
import type { User } from "../types/types";

type Presence = { online: boolean; lastSeenAt: string | null };

type RealtimeState = {
  presence: Record<string, Presence>;
  /** chatId → ids of users currently typing */
  typing: Record<string, string[]>;
  /** The chat currently on screen, so its incoming messages aren't counted as unread. */
  activeChatId: string | null;
  setActiveChat: (chatId: string | null) => void;
  setPresence: (userId: string, presence: Presence) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  reset: () => void;
};

/** Typing indicators expire on their own in case a `typing: false` event is lost. */
const TYPING_TTL_MS = 6_000;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  presence: {},
  typing: {},
  activeChatId: null,
  setActiveChat: (activeChatId) => set({ activeChatId }),
  setPresence: (userId, presence) => set((s) => ({ presence: { ...s.presence, [userId]: presence } })),
  setTyping: (chatId, userId, isTyping) => {
    const key = `${chatId}:${userId}`;
    clearTimeout(typingTimers.get(key));
    if (isTyping) typingTimers.set(key, setTimeout(() => get().setTyping(chatId, userId, false), TYPING_TTL_MS));

    const current = get().typing[chatId] ?? [];
    const has = current.includes(userId);
    if (isTyping === has) return;
    const next = isTyping ? [...current, userId] : current.filter((id) => id !== userId);
    set((s) => ({ typing: { ...s.typing, [chatId]: next } }));
  },
  reset: () => {
    typingTimers.forEach(clearTimeout);
    typingTimers.clear();
    set({ presence: {}, typing: {}, activeChatId: null });
  },
}));

const NO_ONE: string[] = [];

export function useTypingUsers(chatId: string) {
  return useRealtimeStore((s) => s.typing[chatId] ?? NO_ONE);
}

/** Live presence for a user, falling back to what the REST payload said. */
export function usePresence(user: Pick<User, "id" | "online" | "lastSeenAt"> | undefined): Presence {
  const live = useRealtimeStore((s) => (user ? s.presence[user.id] : undefined));
  return live ?? { online: user?.online ?? false, lastSeenAt: user?.lastSeenAt ?? null };
}
