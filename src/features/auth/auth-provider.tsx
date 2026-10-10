import { useEffect, type ReactNode } from "react";
import * as authApi from "../../api/auth.api";
import { onSessionExpired } from "../../api/client";
import * as usersApi from "../../api/users.api";
import { toast } from "../../components/ui/toast-store";
import { endSession } from "./hooks";
import { useSession } from "./session-store";

/**
 * Restores the session on load (refresh cookie → access token → /users/me)
 * and signs the user out if a token refresh is ever rejected.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    onSessionExpired(() => {
      if (useSession.getState().status !== "authenticated") return;
      endSession("expired");
      toast.error("Your session expired. Please sign in again.");
    });

    let cancelled = false;
    authApi
      .refresh()
      .then(() => usersApi.getMe())
      .then((user) => !cancelled && useSession.getState().signIn(user))
      .catch(() => !cancelled && useSession.getState().signOut());
    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
