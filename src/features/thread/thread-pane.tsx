import { useEffect } from "react";
import { Link } from "react-router-dom";
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
      <ThreadHeader chat={chat} meId={me.id} />
      <MessageList chat={chat} meId={me.id} />
      {chat.blocked && peer ? <BlockedBar userId={peer.id} name={peer.name} /> : <Composer chatId={chat.id} />}
    </section>
  );
}
