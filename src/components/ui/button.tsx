import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-fg hover:opacity-90",
  secondary: "bg-pill text-fg hover:opacity-90",
  ghost: "text-accent hover:bg-search-bar",
  danger: "bg-badge-alert text-fg hover:opacity-90",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  block?: boolean;
};

/** Same shape as the Login submit button; `block` makes it full width. */
export function Button({
  variant = "primary",
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-opacity duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-screen",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
