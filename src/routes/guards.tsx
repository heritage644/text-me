import { Navigate, Outlet, useLocation, type Location } from "react-router-dom";
import { useSession } from "../features/auth/session-store";
import { Splash } from "./splash";

type RedirectState = { from?: Location };

/** Signed-in users only; everyone else goes to /login and comes back afterwards. */
export function ProtectedRoute() {
  const status = useSession((s) => s.status);
  const reason = useSession((s) => s.signOutReason);
  const location = useLocation();

  if (status === "loading") return <Splash />;
  if (status === "anonymous") {
    const state: RedirectState | undefined = reason === "manual" ? undefined : { from: location };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Auth screens; signed-in users are sent back to where they were headed. */
export function PublicOnlyRoute() {
  const status = useSession((s) => s.status);
  const from = (useLocation().state as RedirectState | null)?.from;

  if (status === "loading") return <Splash />;
  if (status === "authenticated") {
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/chats"} replace />;
  }
  return <Outlet />;
}
