import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { focusRing } from "./styles";

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean };

/**
 * iOS-style pill ("Edit", "All"). Visually 32px tall; an invisible pseudo-element
 * extends the hit area to 44px.
 */
export function Pill({ active = false, className, type = "button", ...rest }: PillProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
        "before:absolute before:inset-x-0 before:-inset-y-1.5",
        active ? "bg-accent text-fg" : "bg-pill text-fg hover:opacity-90",
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
