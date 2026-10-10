import { create } from "zustand";
import type { CurrentUser } from "../../types/types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionState = {
  status: SessionStatus;
  user: CurrentUser | null;
  /** Why the last session ended; a manual logout shouldn't redirect back to the old page on next login. */
  signOutReason: "manual" | "expired" | null;
  signIn: (user: CurrentUser) => void;
  setUser: (user: CurrentUser) => void;
  signOut: (reason?: "manual" | "expired") => void;
};

/** Who is signed in. The access token itself lives in api/client.ts, never here. */
export const useSession = create<SessionState>((set) => ({
  status: "loading",
  user: null,
  signOutReason: null,
  signIn: (user) => set({ status: "authenticated", user, signOutReason: null }),
  setUser: (user) => set({ user }),
  signOut: (reason) => set({ status: "anonymous", user: null, signOutReason: reason ?? null }),
}));

/** The signed-in user. Only call inside protected routes. */
export function useCurrentUser() {
  const user = useSession((s) => s.user);
  if (!user) throw new Error("useCurrentUser must be used inside a protected route");
  return user;
}
