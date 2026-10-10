import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { focusRing } from "./styles";
import { Icon, type IconName } from "./icon";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  iconClassName?: string;
};

/** 44×44 round icon button. */
export function IconButton({ icon, label, className, iconClassName, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent transition-colors duration-150 hover:bg-search-bar disabled:opacity-40",
        focusRing,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={iconClassName ?? "h-6 w-6"} />
    </button>
  );
}
