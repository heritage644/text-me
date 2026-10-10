import { useMutation } from "@tanstack/react-query";
import * as authApi from "../../api/auth.api";
import { queryClient } from "../../lib/query-client";
import { socket } from "../../realtime/socket";
import { useRealtimeStore } from "../../realtime/presence-store";
import { useSession } from "./session-store";

/** Clears every trace of the session client-side. */
export function endSession(reason: "manual" | "expired") {
  socket.stop();
  queryClient.clear();
  useRealtimeStore.getState().reset();
  useSession.getState().signOut(reason);
}

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    meta: { silent: true },
    onSuccess: ({ user }) => useSession.getState().signIn(user),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
    meta: { silent: true },
    onSuccess: ({ user }) => useSession.getState().signIn(user),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    meta: { silent: true },
    onSettled: () => endSession("manual"),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword, meta: { silent: true } });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword, meta: { silent: true } });
}
