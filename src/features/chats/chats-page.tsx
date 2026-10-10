import { useCallback, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { ConnectionPill } from "../../components/connection-pill";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { Pill } from "../../components/ui/pill";
import { SearchInput } from "../../components/ui/search-input";
import { Spinner } from "../../components/ui/spinner";
import { useIntersection } from "../../hooks/use-intersection";
import { errorMessage } from "../../api/errors";
import type { Chat } from "../../types/types";
import { useCurrentUser } from "../auth/session-store";
import { ChatListItem, type ChatAction } from "./components/chat-list-item";
import { ChatListSkeleton } from "./components/chat-list-skeleton";
import { useChats, useDeleteChat, useUpdateChat } from "./hooks";
import { chatTitle } from "./utils";

type Filter = "all" | "unread" | "groups";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

export default function ChatsPage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const activeId = useMatch("/chats/:chatId/*")?.params.chatId;
  const { chats, status, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useChats();
  const updateChat = useUpdateChat();
  const deleteChat = useDeleteChat();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState(false);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Chat | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useIntersection(sentinel, () => void fetchNextPage(), { enabled: hasNextPage && !isFetchingNextPage });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (filter === "unread" && chat.unreadCount === 0) return false;
      if (filter === "groups" && chat.type !== "group") return false;
      if (!q) return true;
      return (
        chatTitle(chat, me.id).toLowerCase().includes(q) ||
        chat.members.some((m) => m.id !== me.id && m.username.toLowerCase().includes(q))
      );
    });
  }, [chats, filter, query, me.id]);

  const onAction = useCallback(
    (chat: Chat, action: ChatAction) => {
      if (action === "pin") updateChat.mutate({ chatId: chat.id, patch: { pinned: !chat.pinned } });
      if (action === "mute") updateChat.mutate({ chatId: chat.id, patch: { muted: !chat.muted } });
      if (action === "delete") setPendingDelete(chat);
    },
    // `mutate` is stable; depending on the whole mutation object would re-render every row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateChat.mutate],
  );

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteChat.mutate(pendingDelete.id);
    if (pendingDelete.id === activeId) navigate("/chats");
    setPendingDelete(null);
  };

  const isFiltered = query.trim() !== "" || filter !== "all";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-4 pt-safe">
        <div className="flex h-14 items-center justify-between gap-2">
          <Pill onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            {editing ? "Done" : "Edit"}
          </Pill>
          <ConnectionPill />
          <IconButton icon="pencil" label="New chat" onClick={() => navigate("/contacts")} className="-mr-2" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
        <SearchInput label="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="mt-3" />
        <div role="group" aria-label="Filter chats" className="flex gap-2 py-3">
          {FILTERS.map((f) => (
            <Pill key={f.id} active={filter === f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Pill>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
        {status === "pending" ? (
          <ChatListSkeleton />
        ) : status === "error" ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : visible.length === 0 ? (
          isFiltered ? (
            <EmptyState icon="search" title="No matches" description="No chats match your search or filter." />
          ) : (
            <EmptyState
              title="No chats yet"
              description="Start a conversation with someone from your contacts."
              action={<Button onClick={() => navigate("/contacts")}>Start a chat</Button>}
            />
          )
        ) : (
          <>
            <ul aria-label="Conversations">
              {visible.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  meId={me.id}
                  active={chat.id === activeId}
                  editing={editing}
                  swipeOpen={swipeOpenId === chat.id}
                  onSwipeOpenChange={setSwipeOpenId}
                  onAction={onAction}
                />
              ))}
            </ul>
            <div ref={sentinel} className="flex h-12 items-center justify-center">
              {isFetchingNextPage && <Spinner className="h-5 w-5 text-fg-muted" label="Loading more chats" />}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete chat?"
        description={pendingDelete ? `Your conversation with ${chatTitle(pendingDelete, me.id)} will be removed from this list.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
