import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage, isApiError } from "../../api/errors";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState } from "../../components/ui/empty-state";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/cn";
import { useRealtimeStore } from "../../realtime/presence-store";
import { useCurrentUser } from "../auth/session-store";
import { useChat } from "../chats/hooks";
import { chatPeer, chatTitle } from "../chats/utils";
import { useUnblockUser } from "../chat-info/hooks";
import { TagFilterBar } from "../tags/components/tag-filter-bar";
import { TagFilterModal } from "../tags/components/tag-filter-modal";
import { useTags } from "../tags/hooks";
import { Composer } from "./components/composer";
import { MessageList } from "./components/message-list";
import { ThreadHeader } from "./components/thread-header";

function BlockedBar({ userId, name }: { userId: string; name: string }) {
  const unblock = useUnblockUser();
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t border-divider px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
      <p className="text-sm text-fg-muted">You blocked {name}. You can't send or receive messages in this chat.</p>
      <Button variant="ghost" loading={unblock.isPending} onClick={() => unblock.mutate(userId)}>
        Unblock
      </Button>
    </div>
  );
}

export default function ThreadPane({ chatId, className }: { chatId: string; className?: string }) {
  const me = useCurrentUser();
  const { data: chat, status, error, refetch } = useChat(chatId);
  const setActiveChat = useRealtimeStore((s) => s.setActiveChat);

  /*
   * The tag filter lives in the URL (`?tag=<id>`), so a filtered view can be
   * linked to, shared between panes, and survives a reload or a back navigation.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tags } = useTags();
  const [filterOpen, setFilterOpen] = useState(false);
  const activeTag = tags?.find((t) => t.id === searchParams.get("tag")) ?? null;
  const setTagFilter = useCallback(
    (tagId: string | null) => setSearchParams(tagId ? { tag: tagId } : {}, { replace: true }),
    [setSearchParams],
  );

  // Lets realtime handlers know not to count messages in the open chat as unread.
  useEffect(() => {
    setActiveChat(chatId);
    return () => setActiveChat(null);
  }, [chatId, setActiveChat]);

  const frame = cn("min-w-0 flex-1 flex-col", className);

  if (!chat) {
    if (status === "error") {
      const notFound = isApiError(error) && error.kind === "not_found";
      return (
        <section className={cn(frame, "items-center justify-center pt-safe")}>
          {notFound ? (
            <EmptyState
              icon="alert"
              title="Chat not found"
              description="It may have been deleted, or you're no longer a member."
              action={
                <Link to="/chats" className="font-medium text-accent hover:underline">
                  Back to chats
                </Link>
              }
            />
          ) : (
            <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
          )}
        </section>
      );
    }
    return (
      <section className={frame} aria-busy="true">
        <div className="flex h-14 items-center gap-3 border-b border-divider px-4 pt-safe">
          <Skeleton shape="circle" className="h-10 w-10" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </section>
    );
  }

  const peer = chatPeer(chat, me.id);
  return (
    <section aria-label={`Conversation with ${chatTitle(chat, me.id)}`} className={frame}>
      <ThreadHeader chat={chat} meId={me.id} activeTag={activeTag} onOpenTagFilter={() => setFilterOpen(true)} />
      {activeTag && <TagFilterBar tag={activeTag} onClear={() => setTagFilter(null)} />}
      {/* Remount on filter change: the list scrolls to the bottom of the new result set. */}
      <MessageList key={activeTag?.id ?? "all"} chat={chat} meId={me.id} tagFilter={activeTag} onTagFilter={setTagFilter} />
      {chat.blocked && peer ? <BlockedBar userId={peer.id} name={peer.name} /> : <Composer chatId={chat.id} />}
      <TagFilterModal
        open={filterOpen}
        activeTagId={activeTag?.id ?? null}
        onSelect={setTagFilter}
        onClose={() => setFilterOpen(false)}
      />
    </section>
  );
}
