import { cn } from "../../lib/cn";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

/** iOS toggle row. The whole row is the 44px+ hit target. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-base text-fg">{label}</span>
        {description && <span className="block text-sm text-fg-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-status-active" : "bg-pill",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-[27px] w-[27px] rounded-full bg-fg shadow transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
