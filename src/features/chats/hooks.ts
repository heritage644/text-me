import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import * as chatsApi from "../../api/chats.api";
import type { Chat, CreateChatRequest, UpdateChatRequest } from "../../types/types";
import { chatKeys, findChat, patchChat, removeChat, sortChats, upsertChat } from "./cache";

export function useChats() {
  const query = useInfiniteQuery({
    queryKey: chatKeys.list,
    queryFn: ({ pageParam }) => chatsApi.listChats({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const chats = useMemo(() => sortChats(query.data?.pages.flatMap((p) => p.items) ?? []), [query.data]);
  return { ...query, chats };
}

export function useChat(chatId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => chatsApi.getChat(chatId),
    initialData: () => findChat(qc, chatId),
    initialDataUpdatedAt: () => qc.getQueryState(chatKeys.list)?.dataUpdatedAt,
  });
}

/** Optimistic pin / mute / rename, rolled back on failure. */
export function useUpdateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, patch }: { chatId: string; patch: UpdateChatRequest }) => chatsApi.updateChat(chatId, patch),
    onMutate: ({ chatId, patch }) => {
      const previous = findChat(qc, chatId);
      patchChat(qc, chatId, (chat) => ({ ...chat, ...patch }));
      return { previous };
    },
    onError: (_err, { chatId }, ctx) => {
      if (ctx?.previous) patchChat(qc, chatId, () => ctx.previous as Chat);
    },
    onSuccess: (chat) => upsertChat(qc, chat),
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatsApi.deleteChat(chatId),
    onMutate: (chatId) => {
      const previous = findChat(qc, chatId);
      removeChat(qc, chatId);
      return { previous };
    },
    onError: (_err, _chatId, ctx) => {
      if (ctx?.previous) upsertChat(qc, ctx.previous);
    },
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChatRequest) => chatsApi.createChat(body),
    onSuccess: (chat) => upsertChat(qc, chat),
  });
}
