import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api/errors";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ErrorState } from "../../components/ui/empty-state";
import { Icon, type IconName } from "../../components/ui/icon";
import { Modal } from "../../components/ui/modal";
import { Skeleton } from "../../components/ui/skeleton";
import { focusRing } from "../../components/ui/styles";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/cn";
import { formatLastSeen } from "../../lib/format";
import { usePresence } from "../../realtime/presence-store";
import type { Chat, ChatMember, User } from "../../types/types";
import { useCurrentUser } from "../auth/session-store";
import { useChat, useUpdateChat } from "../chats/hooks";
import { chatAvatar, chatPeer, chatTitle } from "../chats/utils";
import { MemberPicker } from "../contacts/components/member-picker";
import { useChatMedia } from "../thread/hooks";
import { useAddMembers, useBlockUser, useLeaveChat, useUnblockUser } from "./hooks";

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
        {action}
      </div>
      <div className="rounded-2xl border border-divider">{children}</div>
    </section>
  );
}

function ActionRow({ icon, label, onClick, danger = false }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left hover:bg-search-bar",
        danger ? "text-badge-alert" : "text-accent",
        focusRing,
      )}
    >
      <Icon name={icon} className="h-5 w-5" />
      {label}
    </button>
  );
}

function MediaGrid({ chatId }: { chatId: string }) {
  const { data, status, error, refetch } = useChatMedia(chatId);
  if (status === "pending") {
    return (
      <div className="grid grid-cols-3 gap-1 p-1" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} shape="tile" className="aspect-square" />
        ))}
      </div>
    );
  }
  if (status === "error") return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  const images = data.items.filter((a) => a.mime.startsWith("image/"));
  if (!images.length) return <p className="px-4 py-6 text-center text-sm text-fg-muted">No photos or files shared yet.</p>;
  return (
    <ul className="grid grid-cols-3 gap-1 p-1">
      {images.map((a) => (
        <li key={a.id}>
          <a href={a.url} target="_blank" rel="noreferrer" className={cn("block overflow-hidden rounded-lg", focusRing)}>
            <img src={a.url} alt={a.name} width={120} height={120} loading="lazy" decoding="async" className="aspect-square w-full bg-search-bar object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function MemberRow({ member, isMe }: { member: ChatMember; isMe: boolean }) {
  const presence = usePresence(member);
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-divider">
      <Avatar name={member.name} src={member.avatarUrl} size={36} online={presence.online && !isMe} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{isMe ? "You" : member.name}</p>
        <p className={cn("truncate text-sm", presence.online && !isMe ? "text-accent" : "text-fg-muted")}>
          {isMe ? `@${member.username}` : formatLastSeen(presence.online, presence.lastSeenAt)}
        </p>
      </div>
      {member.role === "admin" && <span className="rounded-full bg-pill px-2 py-0.5 text-xs text-fg-faint">admin</span>}
    </li>
  );
}

function AddMembersModal({ chat, open, onClose }: { chat: Chat; open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<User[]>([]);
  const add = useAddMembers();
  const close = () => {
    setSelected([]);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Add members"
      footer={
        <Button
          block
          disabled={!selected.length}
          loading={add.isPending}
          onClick={() => add.mutate({ chatId: chat.id, userIds: selected.map((u) => u.id) }, { onSuccess: close })}
        >
          {selected.length ? `Add ${selected.length}` : "Select people"}
        </Button>
      }
    >
      <MemberPicker selected={selected} onChange={setSelected} excludeIds={chat.members.map((m) => m.id)} />
    </Modal>
  );
}

function ChatIdentity({ chat, meId }: { chat: Chat; meId: string }) {
  const peer = chatPeer(chat, meId);
  const presence = usePresence(peer);
  const title = chatTitle(chat, meId);
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <Avatar name={title} src={chatAvatar(chat, meId)} size={96} />
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      {peer ? (
        <>
          <p className="text-fg-muted">@{peer.username}</p>
          <p className={cn("mt-1 text-sm", presence.online && !chat.blocked ? "text-accent" : "text-fg-muted")}>
            {chat.blocked ? "Blocked" : formatLastSeen(presence.online, presence.lastSeenAt)}
          </p>
          {peer.status && <p className="mt-3 max-w-xs text-sm text-fg">“{peer.status}”</p>}
        </>
      ) : (
        <p className="text-fg-muted">Group · {chat.members.length} members</p>
      )}
    </div>
  );
}

type PendingAction = "leave" | "block" | null;

export default function ChatInfoPanel({ chatId }: { chatId: string }) {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const { data: chat, status, error, refetch } = useChat(chatId);
  const updateChat = useUpdateChat();
  const leave = useLeaveChat();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const [confirm, setConfirm] = useState<PendingAction>(null);
  const [adding, setAdding] = useState(false);

  const peer = chat ? chatPeer(chat, me.id) : undefined;

  return (
    <aside aria-label="Chat info" className="flex w-full min-w-0 flex-col lg:w-80 lg:shrink-0 lg:border-l lg:border-divider xl:w-96">
      <header className="shrink-0 border-b border-divider pt-safe">
        <div className="flex h-14 items-center gap-1 px-1 lg:px-3">
          <Link
            to={`/chats/${chatId}`}
            aria-label="Back to conversation"
            className={cn("flex h-11 w-11 items-center justify-center rounded-full text-accent hover:bg-search-bar lg:hidden", focusRing)}
          >
            <Icon name="back" className="h-7 w-7" />
          </Link>
          <h2 className="flex-1 text-center font-semibold lg:text-left">Info</h2>
          <Link
            to={`/chats/${chatId}`}
            aria-label="Close chat info"
            className={cn("hidden h-11 w-11 items-center justify-center rounded-full text-fg-muted hover:bg-search-bar lg:flex", focusRing)}
          >
            <Icon name="close" className="h-5 w-5" />
          </Link>
          <span className="w-11 lg:hidden" aria-hidden="true" />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {!chat ? (
          status === "error" ? (
            <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <div className="flex flex-col items-center gap-3 pt-6" aria-hidden="true">
              <Skeleton shape="circle" className="h-24 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          )
        ) : (
          <>
            <ChatIdentity chat={chat} meId={me.id} />

            <Section title="Notifications">
              <div className="px-4">
                <Switch
                  label="Mute notifications"
                  description={chat.muted ? "You won't be notified about new messages." : undefined}
                  checked={chat.muted}
                  onChange={(muted) => updateChat.mutate({ chatId: chat.id, patch: { muted } })}
                />
              </div>
            </Section>

            <Section title="Media">
              <MediaGrid chatId={chat.id} />
            </Section>

            {chat.type === "group" && (
              <Section
                title={`${chat.members.length} members`}
                action={
                  <button type="button" onClick={() => setAdding(true)} className={cn("min-h-11 rounded-lg px-2 text-sm font-medium text-accent", focusRing)}>
                    Add
                  </button>
                }
              >
                <ul>
                  {chat.members.map((m) => (
                    <MemberRow key={m.id} member={m} isMe={m.id === me.id} />
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Privacy">
              {chat.type === "group" ? (
                <ActionRow icon="logout" label="Leave group" danger onClick={() => setConfirm("leave")} />
              ) : chat.blocked ? (
                <ActionRow icon="block" label={`Unblock ${peer?.name ?? "user"}`} onClick={() => peer && unblock.mutate(peer.id)} />
              ) : (
                <ActionRow icon="block" label={`Block ${peer?.name ?? "user"}`} danger onClick={() => setConfirm("block")} />
              )}
            </Section>

            <ConfirmDialog
              open={confirm === "leave"}
              title="Leave group?"
              description={`You'll stop receiving messages from ${chatTitle(chat, me.id)}.`}
              confirmLabel="Leave"
              destructive
              loading={leave.isPending}
              onClose={() => setConfirm(null)}
              onConfirm={() =>
                leave.mutate(
                  { chatId: chat.id, userId: me.id },
                  {
                    onSuccess: () => navigate("/chats", { replace: true }),
                    onSettled: () => setConfirm(null),
                  },
                )
              }
            />
            <ConfirmDialog
              open={confirm === "block"}
              title={`Block ${peer?.name ?? "user"}?`}
              description="They won't be able to message you, and you won't see their online status."
              confirmLabel="Block"
              destructive
              loading={block.isPending}
              onClose={() => setConfirm(null)}
              onConfirm={() => peer && block.mutate(peer.id, { onSettled: () => setConfirm(null) })}
            />
            {chat.type === "group" && <AddMembersModal chat={chat} open={adding} onClose={() => setAdding(false)} />}
          </>
        )}
      </div>
    </aside>
  );
}
