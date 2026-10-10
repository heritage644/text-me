import { cn } from "../../lib/cn";

type BadgeTone = "accent" | "alert" | "muted" | "inverse";

const TONES: Record<BadgeTone, string> = {
  accent: "bg-accent text-fg",
  alert: "bg-badge-alert text-fg",
  muted: "bg-badge-muted text-fg-faint",
  /** For use on an accent background (e.g. the selected chat row). */
  inverse: "bg-fg text-accent",
};

/** Unread count badge. `alert` for mentions, `muted` for muted chats. */
export function Badge({ count, tone = "accent", label }: { count: number; tone?: BadgeTone; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
        TONES[tone],
      )}
    >
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{label ?? `${count} unread`}</span>
    </span>
  );
}
