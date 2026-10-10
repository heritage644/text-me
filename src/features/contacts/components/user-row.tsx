import { memo, type ReactNode } from "react";
import { Avatar } from "../../../components/ui/avatar";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatLastSeen } from "../../../lib/format";
import { usePresence } from "../../../realtime/presence-store";
import type { User } from "../../../types/types";

type UserRowProps = {
  user: User;
  onSelect: (user: User) => void;
  /** Right-hand slot: checkbox in pickers, spinner while opening a chat. */
  trailing?: ReactNode;
  selected?: boolean;
  role?: "checkbox";
  disabled?: boolean;
};

export const UserRow = memo(function UserRow({ user, onSelect, trailing, selected, role, disabled }: UserRowProps) {
  const presence = usePresence(user);
  return (
    <li>
      <button
        type="button"
        role={role}
        aria-checked={role ? selected : undefined}
        disabled={disabled}
        onClick={() => onSelect(user)}
        className={cn("flex min-h-16 w-full items-center gap-3 pl-4 text-left hover:bg-search-bar disabled:opacity-60", focusRing, "focus-visible:ring-inset")}
      >
        <Avatar name={user.name} src={user.avatarUrl} size={44} online={presence.online} />
        <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-divider py-2 pr-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-fg">{user.name}</span>
            <span className={cn("block truncate text-sm", presence.online ? "text-accent" : "text-fg-muted")}>
              {user.status && !presence.online ? user.status : `@${user.username} · ${formatLastSeen(presence.online, presence.lastSeenAt)}`}
            </span>
          </span>
          {trailing}
        </span>
      </button>
    </li>
  );
});
