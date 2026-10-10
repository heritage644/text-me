import { cn } from "../../../lib/cn";
import { focusRing } from "../../../components/ui/styles";
import type { Tag } from "../../../types/types";
import { tagColorClasses } from "../tag-colors";

type TagChipProps = {
  tag: Tag;
  /** Makes the chip a button (e.g. "show every message with this tag"). */
  onClick?: () => void;
  className?: string;
};

/** Small coloured label shown under a message bubble and in the tag picker. */
export function TagChip({ tag, onClick, className }: TagChipProps) {
  const { fill, chip } = tagColorClasses(tag.color);
  const base = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
    chip,
    className,
  );
  const content = (
    <>
      <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", fill)} />
      <span className="truncate">{tag.label}</span>
    </>
  );

  if (!onClick) return <span className={base}>{content}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show messages tagged ${tag.label}`}
      className={cn(base, "transition-opacity hover:opacity-80", focusRing)}
    >
      {content}
    </button>
  );
}
