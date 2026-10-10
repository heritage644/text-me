import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as chatsApi from "../../api/chats.api";
import * as usersApi from "../../api/users.api";
import { patchChatsWhere, removeChat, upsertChat } from "../chats/cache";

const setBlocked = (qc: QueryClient, userId: string, blocked: boolean) =>
  patchChatsWhere(
    qc,
    (c) => c.type === "direct" && c.members.some((m) => m.id === userId),
    (c) => ({ ...c, blocked }),
  );

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.blockUser,
    onSuccess: (_data, userId) => setBlocked(qc, userId, true),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.unblockUser,
    onSuccess: (_data, userId) => setBlocked(qc, userId, false),
  });
}

export function useLeaveChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, userId }: { chatId: string; userId: string }) => chatsApi.removeMember(chatId, userId),
    onSuccess: (_data, { chatId }) => removeChat(qc, chatId),
  });
}

export function useAddMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, userIds }: { chatId: string; userIds: string[] }) => chatsApi.addMembers(chatId, userIds),
    onSuccess: (chat) => upsertChat(qc, chat),
  });
}
