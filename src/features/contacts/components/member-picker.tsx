import { useRef, useState } from "react";
import { errorMessage } from "../../../api/errors";
import { EmptyState, ErrorState } from "../../../components/ui/empty-state";
import { Icon } from "../../../components/ui/icon";
import { SearchInput } from "../../../components/ui/search-input";
import { Spinner } from "../../../components/ui/spinner";
import { focusRing } from "../../../components/ui/styles";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { useIntersection } from "../../../hooks/use-intersection";
import { cn } from "../../../lib/cn";
import type { User } from "../../../types/types";
import { useUserSearch } from "../hooks";
import { UserListSkeleton } from "./user-list-skeleton";
import { UserRow } from "./user-row";

type MemberPickerProps = {
  selected: User[];
  onChange: (users: User[]) => void;
  /** Users who can't be picked (e.g. existing group members). */
  excludeIds?: string[];
};

/** Searchable multi-select of users, with removable chips for the selection. */
export function MemberPicker({ selected, onChange, excludeIds = [] }: MemberPickerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim());
  const { users, status, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useUserSearch(debounced);
  const sentinel = useRef<HTMLDivElement>(null);
  useIntersection(sentinel, () => void fetchNextPage(), { enabled: hasNextPage && !isFetchingNextPage });

  const selectedIds = new Set(selected.map((u) => u.id));
  const candidates = users.filter((u) => !excludeIds.includes(u.id));
  const toggle = (user: User) =>
    onChange(selectedIds.has(user.id) ? selected.filter((u) => u.id !== user.id) : [...selected, user]);

  return (
    <div className="-mx-5 flex flex-col">
      <div className="px-5">
        <SearchInput label="Search people" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        {selected.length > 0 && (
          <ul aria-label="Selected" className="mt-3 flex flex-wrap gap-2">
            {selected.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  aria-label={`Remove ${u.name}`}
                  className={cn("flex min-h-8 items-center gap-1.5 rounded-full bg-accent py-1 pl-3 pr-2 text-sm text-fg", focusRing)}
                >
                  {u.name}
                  <Icon name="close" className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        {status === "pending" ? (
          <UserListSkeleton rows={6} />
        ) : status === "error" ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : candidates.length === 0 ? (
          <EmptyState icon="search" title="No one found" description={debounced ? `Nobody matches “${debounced}”.` : "No contacts yet."} />
        ) : (
          <ul aria-label="People">
            {candidates.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                role="checkbox"
                selected={selectedIds.has(u.id)}
                onSelect={toggle}
                trailing={
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                      selectedIds.has(u.id) ? "border-accent bg-accent text-fg" : "border-divider",
                    )}
                  >
                    {selectedIds.has(u.id) && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                }
              />
            ))}
          </ul>
        )}
        <div ref={sentinel} className="flex h-10 items-center justify-center">
          {isFetchingNextPage && <Spinner className="h-4 w-4 text-fg-muted" label="Loading more people" />}
        </div>
      </div>
    </div>
  );
}
