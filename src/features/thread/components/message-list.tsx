import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "../../../api/errors";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { EmptyState, ErrorState } from "../../../components/ui/empty-state";
import { Icon } from "../../../components/ui/icon";
import { Skeleton } from "../../../components/ui/skeleton";
import { Spinner } from "../../../components/ui/spinner";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatDayLabel, isSameDay } from "../../../lib/format";
import { useTypingUsers } from "../../../realtime/presence-store";
import type { Chat, Message, Tag } from "../../../types/types";
import { chatTitle } from "../../chats/utils";
import { TagPickerModal } from "../../tags/components/tag-picker-modal";
import { findMessage } from "../cache";
import { useMarkRead, useSendMessage, useThreadMessages } from "../hooks";
import { MessageBubble, type BubbleProps } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";

type Row =
  | { kind: "start"; key: string }
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; props: Omit<BubbleProps, "onRetry" | "onTag" | "onTagFilter"> };

/** Consecutive messages from the same sender within this window form one visual group. */
const GROUP_GAP_MS = 5 * 60_000;
/** Below this many rows plain DOM is cheaper and simpler than virtualisation. */
const VIRTUALIZE_AFTER = 200;
const STICK_THRESHOLD_PX = 120;
const JUMP_BUTTON_THRESHOLD_PX = 300;
const LOAD_OLDER_THRESHOLD_PX = 400;

const keyOf = (m: Message) => m.tempId ?? m.id;

function joins(a: Message | undefined, b: Message | undefined) {
  return (
    !!a &&
    !!b &&
    a.senderId === b.senderId &&
    isSameDay(a.createdAt, b.createdAt) &&
    Math.abs(Date.parse(b.createdAt) - Date.parse(a.createdAt)) < GROUP_GAP_MS
  );
}

function buildRows(messages: Message[], chat: Chat, meId: string, reachedStart: boolean): Row[] {
  const rows: Row[] = reachedStart && messages.length ? [{ kind: "start", key: "start" }] : [];
  const isGroup = chat.type === "group";
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !isSameDay(prev.createdAt, m.createdAt)) {
      rows.push({ kind: "day", key: `day-${new Date(m.createdAt).toDateString()}`, label: formatDayLabel(m.createdAt) });
    }
    const isOwn = m.senderId === meId;
    const groupStart = !joins(prev, m);
    const groupEnd = !joins(m, next);
    const sender = isGroup && !isOwn ? chat.members.find((u) => u.id === m.senderId) : undefined;
    rows.push({
      kind: "message",
      key: keyOf(m),
      props: {
        message: m,
        isOwn,
        senderName: sender && groupStart ? sender.name : null,
        avatarName: isGroup && !isOwn && groupEnd ? (sender?.name ?? "?") : null,
        avatarSrc: isGroup && !isOwn && groupEnd ? (sender?.avatarUrl ?? null) : null,
        avatarGutter: isGroup && !isOwn,
        groupStart,
        groupEnd,
      },
    });
  });
  return rows;
}

function ThreadSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-1 flex-col justify-end gap-2 px-4 py-4">
      {["w-40", "w-56 self-end", "w-32 self-end", "w-64", "w-48", "w-36 self-end"].map((w, i) => (
        <Skeleton key={i} shape="bubble" className={cn("h-9", w)} />
      ))}
    </div>
  );
}

type MessageListProps = {
  chat: Chat;
  meId: string;
  /** When set, only messages carrying this tag are listed. */
  tagFilter: Tag | null;
  onTagFilter: (tagId: string | null) => void;
};

export function MessageList({ chat, meId, tagFilter, onTagFilter }: MessageListProps) {
  const qc = useQueryClient();
  const { messages, status, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useThreadMessages(
    chat.id,
    tagFilter?.id ?? null,
  );
  const send = useSendMessage(chat.id);
  const someoneTyping = useTypingUsers(chat.id).some((id) => id !== meId);
  // A filtered view is a search, not "reading the chat", so it doesn't mark anything read.
  useMarkRead(chat.id, tagFilter ? [] : messages, meId);

  const [tagging, setTagging] = useState<Message | null>(null);
  const openTagPicker = useCallback((message: Message) => setTagging(message), []);

  /*
   * The picker edits the tags of one message, so it needs the *current* copy:
   * prefer the visible list, then the unfiltered thread cache (a message can
   * leave a filtered list the moment it loses the tag being shown).
   */
  const taggingMessage = tagging
    ? (messages.find((m) => m.id === tagging.id) ?? findMessage(qc, { chatId: chat.id, id: tagging.id }) ?? tagging)
    : null;

  const rows = useMemo(
    () => buildRows(messages, chat, meId, status === "success" && !hasNextPage),
    [messages, chat, meId, status, hasNextPage],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = rows.length > VIRTUALIZE_AFTER;
  // The virtualizer's API isn't memoisable by the React Compiler; that's fine here (the compiler isn't enabled).
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i]?.kind === "message" ? 60 : 44),
    getItemKey: (i) => rows[i]?.key ?? i,
    overscan: 10,
  });

  const atBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const firstKey = messages[0] ? keyOf(messages[0]) : null;
  const lastMessage = messages.at(-1);
  const lastKey = lastMessage ? keyOf(lastMessage) : null;

  // Derived (not stored) so it can't drift: incoming messages after the last one seen at the bottom.
  const unseen = useMemo(() => {
    const index = seenKey ? messages.findIndex((m) => keyOf(m) === seenKey) : -1;
    return index < 0 ? 0 : messages.slice(index + 1).filter((m) => m.senderId !== meId).length;
  }, [messages, seenKey, meId]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? "smooth" : "auto" });
    // Virtualised rows are measured after they render; settle on the real bottom next frame.
    if (!smooth) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
  }, []);

  /*
   * Scroll bookkeeping after every render:
   *  - first data → jump to the bottom
   *  - older page prepended → keep the same messages under the user's eyes
   *  - new message appended → follow it if the user was at the bottom (or sent it)
   */
  const prev = useRef({ firstKey: null as string | null, lastKey: null as string | null, typing: false, scrollHeight: 0 });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const p = prev.current;
    if (!p.lastKey && lastKey) {
      scrollToBottom();
    } else if (firstKey !== p.firstKey && lastKey === p.lastKey) {
      el.scrollTop += el.scrollHeight - p.scrollHeight;
    } else if (lastKey !== p.lastKey) {
      if (atBottom.current || lastMessage?.senderId === meId) scrollToBottom(true);
    } else if (someoneTyping !== p.typing && atBottom.current) {
      scrollToBottom(true);
    }
    prev.current = { firstKey, lastKey, typing: someoneTyping, scrollHeight: el.scrollHeight };
  });

  // The viewport shrinks when the attachment tray opens or the on-screen keyboard appears: stay pinned to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let height = el.clientHeight;
    const observer = new ResizeObserver(() => {
      if (el.clientHeight < height && atBottom.current) el.scrollTop = el.scrollHeight;
      height = el.clientHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  // If the first page doesn't fill the viewport, keep loading older messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || status !== "success" || !hasNextPage || isFetchingNextPage) return;
    if (el.scrollHeight <= el.clientHeight + LOAD_OLDER_THRESHOLD_PX) void fetchNextPage();
  }, [rows.length, status, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = distance < STICK_THRESHOLD_PX;
    setShowJump(distance > JUMP_BUTTON_THRESHOLD_PX);
    if (atBottom.current) setSeenKey(lastKey);
    prev.current.scrollHeight = el.scrollHeight;
    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  const retry = useCallback(
    (message: Message) => send({ body: message.body, attachments: message.attachments, retryOf: message }),
    [send],
  );

  const renderRow = (row: Row) => {
    if (row.kind === "start") {
      return <p className="px-6 pb-2 pt-4 text-center text-xs text-fg-muted">This is the beginning of your conversation.</p>;
    }
    if (row.kind === "day") {
      return (
        <div className="flex justify-center pb-1 pt-4">
          <span className="rounded-full bg-pill px-3 py-1 text-xs font-medium text-fg-muted">{row.label}</span>
        </div>
      );
    }
    return <MessageBubble {...row.props} onRetry={retry} onTag={openTagPicker} onTagFilter={onTagFilter} />;
  };

  if (status === "pending") return <ThreadSkeleton />;
  if (status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isFetchingNextPage && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <span className="rounded-full border border-divider bg-pill p-2 text-fg-muted">
            <Spinner className="h-4 w-4" label="Loading earlier messages" />
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label={`Messages with ${chatTitle(chat, meId)}`}
        // New messages are announced via the LiveRegion instead, so scrolling history stays quiet.
        aria-live="off"
        tabIndex={0}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 [overflow-anchor:none]", focusRing, "focus-visible:ring-inset")}
      >
        {messages.length === 0 ? (
          tagFilter ? (
            <EmptyState
              icon="tag"
              title={`No messages tagged “${tagFilter.label}”`}
              description="Tag a message to collect it here."
              action={
                <Button variant="secondary" onClick={() => onTagFilter(null)}>
                  Show all messages
                </Button>
              }
            />
          ) : (
            <EmptyState title="No messages yet" description={`Say hello to ${chatTitle(chat, meId)}.`} />
          )
        ) : virtual ? (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                {renderRow(rows[item.index])}
              </div>
            ))}
          </div>
        ) : (
          rows.map((row) => <div key={row.key}>{renderRow(row)}</div>)
        )}
        {someoneTyping && <TypingIndicator />}
      </div>

      <button
        type="button"
        onClick={() => scrollToBottom(true)}
        tabIndex={showJump ? 0 : -1}
        aria-hidden={!showJump}
        aria-label={unseen ? `${unseen} new messages. Scroll to latest` : "Scroll to latest message"}
        className={cn(
          "absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-divider bg-pill text-fg shadow-lg transition-[opacity,transform] duration-200",
          showJump ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          focusRing,
        )}
      >
        <Icon name="chevronDown" className="h-6 w-6" />
        {unseen > 0 && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2">
            <Badge count={unseen} label={`${unseen} new`} />
          </span>
        )}
      </button>

      {/* Keyed by message so the form resets for every message the picker is opened on. */}
      <TagPickerModal
        key={taggingMessage?.id ?? "closed"}
        open={!!taggingMessage}
        message={taggingMessage}
        onClose={() => setTagging(null)}
      />
    </div>
  );
}
