import { Icon } from "../../../components/ui/icon";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import type { Tag } from "../../../types/types";
import { TagChip } from "./tag-chip";

type TagFilterBarProps = {
  tag: Tag;
  onClear: () => void;
};

/** Shown above a thread while it is narrowed down to one tag. */
export function TagFilterBar({ tag, onClear }: TagFilterBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-divider px-3 py-2 md:px-4">
      <Icon name="filter" className="h-4 w-4 shrink-0 text-fg-muted" />
      <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">
        Only messages tagged <TagChip tag={tag} className="align-middle" />
      </span>
      <button
        type="button"
        onClick={onClear}
        className={cn("flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-accent hover:bg-search-bar", focusRing)}
      >
        <Icon name="close" className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}
