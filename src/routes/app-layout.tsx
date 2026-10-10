import { lazy, Suspense, useEffect } from "react";
import { Outlet, useMatch, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/ui/empty-state";
import { Spinner } from "../components/ui/spinner";
import { useAppHeight } from "../hooks/use-app-height";
import { cn } from "../lib/cn";
import { BottomNav } from "./bottom-nav";

const ThreadPane = lazy(() => import("../features/thread/thread-pane"));
const ChatInfoPanel = lazy(() => import("../features/chat-info/chat-info-panel"));

function PaneFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner className="h-6 w-6 text-fg-muted" label="Loading" />
    </div>
  );
}

/**
 * Phones: one pane at a time (list, thread, or info), routed.
 * md+: list on the left, thread on the right.
 * lg+: chat info opens as a third, collapsible column next to the thread.
 */
export default function AppLayout() {
  useAppHeight();
  const navigate = useNavigate();
  const chatId = useMatch("/chats/:chatId/*")?.params.chatId;
  const infoOpen = Boolean(useMatch("/chats/:chatId/info"));

  // Escape closes the open chat, unless a dialog is handling it.
  useEffect(() => {
    if (!chatId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      navigate(infoOpen ? `/chats/${chatId}` : "/chats");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatId, infoOpen, navigate]);

  return (
    <div className="flex h-app w-full overflow-hidden bg-screen text-fg">
      <aside
        className={cn(
          "relative min-h-0 flex-col border-divider md:flex md:w-80 md:shrink-0 md:border-r lg:w-[22rem] xl:w-96",
          chatId ? "hidden" : "flex w-full",
        )}
      >
        <Suspense fallback={<PaneFallback />}>
          <Outlet />
        </Suspense>
        <BottomNav />
      </aside>

      <main className={cn("min-w-0 flex-1", chatId ? "flex" : "hidden md:flex")}>
        {chatId ? (
          <Suspense fallback={<PaneFallback />}>
            <ThreadPane key={chatId} chatId={chatId} className={infoOpen ? "hidden lg:flex" : "flex"} />
            {infoOpen && <ChatInfoPanel key={`info-${chatId}`} chatId={chatId} />}
          </Suspense>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="No chat selected" description="Pick a conversation on the left, or start a new one from Contacts." />
          </div>
        )}
      </main>
    </div>
  );
}
