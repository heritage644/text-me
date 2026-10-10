import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as usersApi from "../../api/users.api";
import { useCreateChat } from "../chats/hooks";

/** Empty search returns the user's contacts; otherwise a server-side search. */
export function useUserSearch(search: string) {
  const query = useInfiniteQuery({
    queryKey: ["users", search],
    queryFn: ({ pageParam }) => usersApi.searchUsers({ search, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: (previous) => previous,
  });
  const users = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  return { ...query, users };
}

/** Opens (or creates) the 1:1 chat with a user. */
export function useStartDirectChat() {
  const navigate = useNavigate();
  const create = useCreateChat();
  return {
    start: (userId: string) =>
      create.mutate({ type: "direct", memberIds: [userId] }, { onSuccess: (chat) => navigate(`/chats/${chat.id}`) }),
    pendingUserId: create.isPending ? (create.variables?.memberIds[0] ?? null) : null,
  };
}
