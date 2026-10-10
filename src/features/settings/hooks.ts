import { useMutation } from "@tanstack/react-query";
import * as usersApi from "../../api/users.api";
import type { NotificationSettings } from "../../types/types";
import { useSession } from "../auth/session-store";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: usersApi.updateMe,
    meta: { silent: true },
    onSuccess: (user) => useSession.getState().setUser(user),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: usersApi.changePassword, meta: { silent: true } });
}

/** Optimistic toggle; the switch flips immediately and reverts if the save fails. */
export function useUpdateNotifications() {
  return useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) => usersApi.updateMe({ notifications: patch }),
    onMutate: (patch) => {
      const { user, setUser } = useSession.getState();
      if (!user) return {};
      setUser({ ...user, notifications: { ...user.notifications, ...patch } });
      return { previous: user };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) useSession.getState().setUser(ctx.previous);
    },
    onSuccess: (user) => useSession.getState().setUser(user),
  });
}
