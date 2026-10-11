import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import * as tagsApi from "../../api/tags.api";
import type { CreateTagRequest, Message, Tag, UpdateTagRequest } from "../../types/types";
import { findMessage, removeTagFromMessages, replaceTagInMessages, setMessageTags } from "../thread/cache";
import { removeTag, tagKeys, upsertTag } from "./cache";

/**
 * The current user's tags. The list is kept fresh by the socket
 * (`tag:updated` / `tag:deleted` in RealtimeProvider), so it is never stale-time'd out.
 */
export function useTags() {
  return useQuery({
    queryKey: tagKeys.list,
    queryFn: tagsApi.listTags,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTagRequest) => tagsApi.createTag(body),
    onSuccess: (tag) => upsertTag(qc, tag),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, patch }: { tagId: string; patch: UpdateTagRequest }) => tagsApi.updateTag(tagId, patch),
    onSuccess: (tag) => {
      upsertTag(qc, tag);
      replaceTagInMessages(qc, tag);
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => tagsApi.deleteTag(tagId),
    onSuccess: (_data, tagId) => {
      removeTag(qc, tagId);
      removeTagFromMessages(qc, tagId);
    },
  });
}

/**
 * Replace a message's tags, optimistically. `tags` is the *complete* new set,
 * which mirrors `PUT /messages/:id/tags`.
 */
export function useSetMessageTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ message, tags }: { message: Message; tags: Tag[] }) =>
      tagsApi.setMessageTags(message.id, tags.map((t) => t.id)),
    onMutate: ({ message, tags }) => {
      const previous = findMessage(qc, message)?.tags ?? message.tags;
      setMessageTags(qc, message, tags);
      return { previous };
    },
    onError: (_error, { message }, context) => {
      if (context) setMessageTags(qc, message, context.previous);
    },
    onSuccess: (message) => {
      setMessageTags(qc, message, message.tags);
      // A tag search on screen may have gained or lost this message.
      void qc.invalidateQueries({ queryKey: tagKeys.anyMessages, refetchType: "active" });
    },
  });
}

/** Messages carrying `tagId`, newest first, scoped to one chat when `chatId` is set. */
export function useTaggedMessages(tagId: string | null, chatId?: string) {
  const query = useInfiniteQuery({
    queryKey: tagKeys.messages(tagId ?? "", chatId),
    queryFn: ({ pageParam }) => tagsApi.listTaggedMessages(tagId as string, { chatId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(tagId),
  });
  const messages = useMemo(() => (query.data ? query.data.pages.flatMap((p) => p.items).reverse() : []), [query.data]);
  return { ...query, messages };
}
