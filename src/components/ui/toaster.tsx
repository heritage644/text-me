import { cn } from "../../lib/cn";
import { Icon } from "./icon";
import { useToastStore, type ToastItem } from "./toast-store";

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-divider bg-pill px-4 py-3 text-sm text-fg shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]">
      <Icon
        name={item.tone === "error" ? "alert" : item.tone === "success" ? "check" : "info"}
        className={cn(
          "h-5 w-5 shrink-0",
          item.tone === "error" ? "text-badge-alert" : item.tone === "success" ? "text-status-active" : "text-accent",
        )}
      />
      <p className="min-w-0 flex-1">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            dismiss(item.id);
          }}
          className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const errors = toasts.filter((t) => t.tone === "error");
  const others = toasts.filter((t) => t.tone !== "error");

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div aria-live="assertive" className="flex w-full max-w-sm flex-col gap-2">
        {errors.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </div>
      <div aria-live="polite" className="flex w-full max-w-sm flex-col gap-2">
        {others.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </div>
    </div>
  );
}
