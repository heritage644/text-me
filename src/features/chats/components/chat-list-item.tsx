import { memo, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Icon, type IconName } from "../../../components/ui/icon";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatChatTimestamp } from "../../../lib/format";
import { usePresence, useTypingUsers } from "../../../realtime/presence-store";
import type { Chat } from "../../../types/types";
import { chatAvatar, chatPeer, chatTitle, firstName, memberName, messagePreview } from "../utils";

export type ChatAction = "pin" | "mute" | "delete";

type ChatListItemProps = {
  chat: Chat;
  meId: string;
  active: boolean;
  editing: boolean;
  swipeOpen: boolean;
  onSwipeOpenChange: (chatId: string | null) => void;
  onAction: (chat: Chat, action: ChatAction) => void;
};

const SWIPE_ACTION_WIDTH = 72;
const SWIPE_WIDTH = SWIPE_ACTION_WIDTH * 3;

function actionMeta(chat: Chat): Array<{ action: ChatAction; label: string; icon: IconName; tone: string }> {
  return [
    { action: "pin", label: chat.pinned ? "Unpin" : "Pin", icon: "pin", tone: "bg-accent" },
    { action: "mute", label: chat.muted ? "Unmute" : "Mute", icon: chat.muted ? "bell" : "bellOff", tone: "bg-pill" },
    { action: "delete", label: "Delete", icon: "trash", tone: "bg-badge-alert" },
  ];
}

function useTypingLabel(chat: Chat) {
  const typing = useTypingUsers(chat.id);
  if (!typing.length) return null;
  if (chat.type === "direct") return "typing…";
  return typing.length === 1 ? `${firstName(memberName(chat, typing[0]))} is typing…` : `${typing.length} people are typing…`;
}

/**
 * One row in the chat list. Actions (pin / mute / delete) are reachable three ways:
 * swipe left on touch screens, hover/focus on pointer devices, or the list's Edit mode.
 */
export const ChatListItem = memo(function ChatListItem({
  chat,
  meId,
  active,
  editing,
  swipeOpen,
  onSwipeOpenChange,
  onAction,
}: ChatListItemProps) {
  const title = chatTitle(chat, meId);
  const peer = chatPeer(chat, meId);
  const presence = usePresence(peer);
  const typingLabel = useTypingLabel(chat);
  const actions = actionMeta(chat);

  const [dragX, setDragX] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const suppressClick = useRef(false);
  const offset = dragX ?? (swipeOpen ? -SWIPE_WIDTH : 0);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || editing) return;
    drag.current = { x: e.clientX, y: e.clientY, base: offset, horizontal: null };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (d.horizontal) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.horizontal) setDragX(Math.max(-SWIPE_WIDTH, Math.min(0, d.base + dx)));
  };
  const onPointerEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.horizontal) return;
    suppressClick.current = true;
    onSwipeOpenChange((dragX ?? 0) < -SWIPE_WIDTH / 2 ? chat.id : null);
    setDragX(null);
  };

  const preview = chat.lastMessage ? messagePreview(chat.lastMessage, chat, meId) : "No messages yet";
  const unread = chat.unreadCount;
  const badgeTone = active ? "inverse" : chat.muted ? "muted" : chat.mentionCount > 0 ? "alert" : "accent";
  const muted = active ? "text-fg/80" : "text-fg-muted";

  return (
    <li className="relative overflow-hidden">
      {/* Swipe-revealed actions (touch screens) */}
      <div className="absolute inset-y-0 right-0 flex pointer-fine:hidden" aria-hidden={!swipeOpen}>
        {actions.map((a) => (
          <button
            key={a.action}
            type="button"
            tabIndex={swipeOpen ? 0 : -1}
            onClick={() => {
              onSwipeOpenChange(null);
              onAction(chat, a.action);
            }}
            className={cn("flex flex-col items-center justify-center gap-1 text-xs font-medium text-fg", a.tone, focusRing)}
            style={{ width: SWIPE_ACTION_WIDTH }}
          >
            <Icon name={a.icon} className="h-5 w-5" />
            {a.label}
          </button>
        ))}
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(
          "group relative touch-pan-y",
          active ? "bg-accent" : "bg-screen pointer-fine:hover:bg-search-bar",
          dragX === null && "transition-transform duration-200",
        )}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      >
        <Link
          to={`/chats/${chat.id}`}
          aria-current={active ? "page" : undefined}
          onClickCapture={(e) => {
            if (suppressClick.current || swipeOpen) {
              e.preventDefault();
              suppressClick.current = false;
              if (swipeOpen) onSwipeOpenChange(null);
            }
          }}
          className={cn("flex min-h-[76px] items-center gap-3 pl-4", focusRing, "focus-visible:ring-inset")}
        >
          <Avatar name={title} src={chatAvatar(chat, meId)} size={52} online={presence.online && chat.type === "direct"} />
          <div className={cn("flex min-w-0 flex-1 items-center gap-2 self-stretch py-2.5 pr-4", !active && "border-b border-divider")}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-fg">{title}</span>
                {chat.muted && <Icon name="bellOff" className={cn("h-3.5 w-3.5 shrink-0", active ? "text-fg/80" : "text-icon-mute")} aria-label="Muted" />}
              </div>
              <p className={cn("mt-0.5 line-clamp-2 text-[15px] leading-snug", typingLabel ? (active ? "text-fg" : "text-accent") : muted)}>
                {typingLabel ?? preview}
              </p>
            </div>
            <div
              className={cn(
                "flex shrink-0 flex-col items-end gap-1.5 self-start pt-0.5",
                editing ? "invisible" : "pointer-fine:group-focus-within:invisible pointer-fine:group-hover:invisible",
              )}
            >
              {chat.lastMessage && <time className={cn("text-sm", unread && !chat.muted && !active ? "text-accent" : muted)} dateTime={chat.lastMessage.createdAt}>{formatChatTimestamp(chat.lastMessage.createdAt)}</time>}
              <div className="flex h-5 items-center gap-1">
                {chat.pinned && <Icon name="pin" className={cn("h-4 w-4", active ? "text-fg/80" : "text-icon-mute")} aria-label="Pinned" />}
                {unread > 0 && (
                  <Badge
                    count={unread}
                    tone={badgeTone}
                    label={`${unread} unread${chat.mentionCount ? `, ${chat.mentionCount} mentioning you` : ""}`}
                  />
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Hover / focus / Edit-mode actions (siblings of the link: no nested interactive content) */}
        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-inherit pl-2",
            editing ? "flex" : "hidden pointer-fine:group-focus-within:flex pointer-fine:group-hover:flex",
          )}
        >
          {actions.map((a) => (
            <button
              key={a.action}
              type="button"
              onClick={() => onAction(chat, a.action)}
              aria-label={`${a.label} ${title}`}
              title={a.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150",
                a.action === "delete" ? "text-badge-alert" : "text-fg",
                active ? "hover:bg-fg/15" : "bg-pill hover:opacity-90",
                focusRing,
              )}
            >
              <Icon name={a.icon} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </div>
    </li>
  );
});
