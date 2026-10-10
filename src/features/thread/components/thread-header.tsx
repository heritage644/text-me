import { Link, useMatch } from "react-router-dom";
import { Avatar } from "../../../components/ui/avatar";
import { Icon } from "../../../components/ui/icon";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatLastSeen } from "../../../lib/format";
import { usePresence, useRealtimeStore, useTypingUsers } from "../../../realtime/presence-store";
import type { Chat, Tag } from "../../../types/types";
import { chatAvatar, chatPeer, chatTitle, firstName, memberName } from "../../chats/utils";

function useSubtitle(chat: Chat, meId: string) {
  const typing = useTypingUsers(chat.id).filter((id) => id !== meId);
  const peer = chatPeer(chat, meId);
  const presence = usePresence(peer);
  const livePresence = useRealtimeStore((s) => s.presence);

  if (typing.length) {
    const text =
      chat.type === "direct"
        ? "typing…"
        : typing.length === 1
          ? `${firstName(memberName(chat, typing[0]))} is typing…`
          : `${typing.length} people are typing…`;
    return { text, highlight: true };
  }
  if (chat.type === "direct") {
    return { text: chat.blocked ? "blocked" : formatLastSeen(presence.online, presence.lastSeenAt), highlight: presence.online && !chat.blocked };
  }
  const online = chat.members.filter((m) => m.id !== meId && (livePresence[m.id]?.online ?? m.online)).length;
  return { text: `${chat.members.length} members${online ? `, ${online} online` : ""}`, highlight: false };
}

type ThreadHeaderProps = {
  chat: Chat;
  meId: string;
  /** The tag the thread is filtered by, or `null` when everything is shown. */
  activeTag: Tag | null;
  onOpenTagFilter: () => void;
};

export function ThreadHeader({ chat, meId, activeTag, onOpenTagFilter }: ThreadHeaderProps) {
  const infoOpen = Boolean(useMatch("/chats/:chatId/info"));
  const title = chatTitle(chat, meId);
  const peer = chatPeer(chat, meId);
  const presence = usePresence(peer);
  const subtitle = useSubtitle(chat, meId);
  const infoHref = infoOpen ? `/chats/${chat.id}` : `/chats/${chat.id}/info`;

  return (
    <header className="shrink-0 border-b border-divider pt-safe">
      <div className="flex h-14 items-center gap-1 px-1 md:px-3">
        <Link
          to="/chats"
          aria-label="Back to chats"
          className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent hover:bg-search-bar md:hidden", focusRing)}
        >
          <Icon name="back" className="h-7 w-7" />
        </Link>
        <Link to={infoHref} className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1", focusRing)}>
          <Avatar name={title} src={chatAvatar(chat, meId)} size={40} online={presence.online && chat.type === "direct" && !chat.blocked} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold">{title}</span>
            <span aria-live="polite" className={cn("block truncate text-sm", subtitle.highlight ? "text-accent" : "text-fg-muted")}>
              {subtitle.text}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onOpenTagFilter}
          aria-label={activeTag ? `Filtering by ${activeTag.label}. Change the tag filter` : "Filter messages by tag"}
          title={activeTag ? `Filtering by ${activeTag.label}` : "Filter messages by tag"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-search-bar",
            activeTag ? "text-icon-active" : "text-accent",
            focusRing,
          )}
        >
          <Icon name={activeTag ? "filter" : "tag"} className="h-6 w-6" />
        </button>
        <Link
          to={infoHref}
          aria-label={infoOpen ? "Hide chat info" : "Show chat info"}
          aria-expanded={infoOpen}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-search-bar",
            infoOpen ? "text-icon-active" : "text-accent",
            focusRing,
          )}
        >
          <Icon name="info" className="h-6 w-6" />
        </Link>
      </div>
    </header>
  );
}
