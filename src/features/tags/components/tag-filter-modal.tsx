import { errorMessage } from "../../../api/errors";
import { ErrorState } from "../../../components/ui/empty-state";
import { Icon } from "../../../components/ui/icon";
import { Modal } from "../../../components/ui/modal";
import { Skeleton } from "../../../components/ui/skeleton";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { useTags } from "../hooks";
import { tagColorClasses } from "../tag-colors";

type TagFilterModalProps = {
  open: boolean;
  /** The tag the thread is currently filtered by, or `null` for "everything". */
  activeTagId: string | null;
  onSelect: (tagId: string | null) => void;
  onClose: () => void;
};

/** Narrows a thread down to the messages carrying one of the user's tags. */
export function TagFilterModal({ open, activeTagId, onSelect, onClose }: TagFilterModalProps) {
  const { data: tags, status, error, refetch } = useTags();
  const all = tags ?? [];

  const pick = (tagId: string | null) => {
    onSelect(tagId);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Filter by tag">
      {status === "pending" ? (
        <div className="space-y-3" aria-hidden="true">
          {["w-40", "w-32"].map((w, i) => (
            <Skeleton key={i} className={cn("h-10", w)} />
          ))}
        </div>
      ) : status === "error" ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <>
          <ul>
            <li>
              <button
                type="button"
                onClick={() => pick(null)}
                aria-pressed={!activeTagId}
                className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-search-bar", focusRing)}
              >
                <Icon name="chats" className="h-5 w-5 shrink-0 text-fg-muted" />
                <span className="min-w-0 flex-1">All messages</span>
                {!activeTagId && <Icon name="check" className="h-5 w-5 shrink-0 text-accent" aria-label="Selected" />}
              </button>
            </li>
            {all.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => pick(tag.id)}
                  aria-pressed={activeTagId === tag.id}
                  className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-search-bar", focusRing)}
                >
                  <span aria-hidden="true" className={cn("h-3 w-3 shrink-0 rounded-full", tagColorClasses(tag.color).fill)} />
                  <span className="min-w-0 flex-1 truncate">{tag.label}</span>
                  {activeTagId === tag.id && <Icon name="check" className="h-5 w-5 shrink-0 text-accent" aria-label="Selected" />}
                </button>
              </li>
            ))}
          </ul>
          {!all.length && (
            <p className="mt-3 px-3 text-sm text-fg-muted">
              No tags yet. Tap the tag button next to a message to create one.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
