import { useRef, useState } from "react";
import { errorMessage } from "../../api/errors";
import { EmptyState, ErrorState } from "../../components/ui/empty-state";
import { Icon } from "../../components/ui/icon";
import { SearchInput } from "../../components/ui/search-input";
import { Spinner } from "../../components/ui/spinner";
import { focusRing } from "../../components/ui/styles";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { useIntersection } from "../../hooks/use-intersection";
import { cn } from "../../lib/cn";
import { CreateGroupModal } from "./components/create-group-modal";
import { UserListSkeleton } from "./components/user-list-skeleton";
import { UserRow } from "./components/user-row";
import { useStartDirectChat, useUserSearch } from "./hooks";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const debounced = useDebouncedValue(search.trim());
  const { users, status, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, isFetching } = useUserSearch(debounced);
  const { start, pendingUserId } = useStartDirectChat();
  const sentinel = useRef<HTMLDivElement>(null);
  useIntersection(sentinel, () => void fetchNextPage(), { enabled: hasNextPage && !isFetchingNextPage });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-4 pt-safe">
        <div className="flex h-14 items-center">
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        </div>
        <SearchInput label="Search by name or username" value={search} onChange={(e) => setSearch(e.target.value)} />
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
        <button
          type="button"
          onClick={() => setGroupOpen(true)}
          className={cn("flex min-h-16 w-full items-center gap-3 pl-4 text-left text-accent hover:bg-search-bar", focusRing, "focus-visible:ring-inset")}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pill">
            <Icon name="userPlus" className="h-5 w-5" />
          </span>
          <span className="flex flex-1 self-stretch items-center border-b border-divider pr-4 font-medium">New group</span>
        </button>

        <h2 className="flex items-center gap-2 px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {debounced ? "Search results" : "People"}
          {isFetching && !isFetchingNextPage && status === "success" && <Spinner className="h-3 w-3" />}
        </h2>

        {status === "pending" ? (
          <UserListSkeleton />
        ) : status === "error" ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon="contacts"
            title={debounced ? "No one found" : "No contacts yet"}
            description={debounced ? `Nobody matches “${debounced}”. Try their username.` : "Search for people by name or username to start chatting."}
          />
        ) : (
          <ul aria-label="People" aria-busy={isFetching}>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSelect={(u) => start(u.id)}
                disabled={pendingUserId !== null}
                trailing={pendingUserId === user.id ? <Spinner className="h-4 w-4 text-fg-muted" label="Opening chat" /> : <Icon name="chevronRight" className="h-4 w-4 text-fg-muted" />}
              />
            ))}
          </ul>
        )}
        <div ref={sentinel} className="flex h-12 items-center justify-center">
          {isFetchingNextPage && <Spinner className="h-5 w-5 text-fg-muted" label="Loading more people" />}
        </div>
      </div>

      <CreateGroupModal open={groupOpen} onClose={() => setGroupOpen(false)} />
    </div>
  );
}
