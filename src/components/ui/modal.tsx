import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "./icon-button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Small dialogs (confirmations) stay centred on phones instead of going full-screen. */
  compact?: boolean;
};

/**
 * Built on the native <dialog>: focus trapping, Escape, inert background and
 * focus restoration come from the browser.
 */
export function Modal({ open, onClose, title, children, footer, compact = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto flex-col overflow-hidden border border-divider bg-screen p-0 text-fg backdrop:bg-screen/70 backdrop:backdrop-blur-sm open:flex",
        compact
          ? "w-[calc(100%-2rem)] max-w-sm rounded-2xl"
          : "h-dvh max-h-dvh w-full max-w-full sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-2xl",
      )}
    >
      {open && (
        <>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-divider py-1 pl-5 pr-2 pt-safe sm:pt-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <IconButton icon="close" label="Close" onClick={onClose} className="text-fg-muted" />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="shrink-0 border-t border-divider px-5 py-3 pb-safe sm:pb-3">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
