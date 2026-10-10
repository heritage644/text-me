import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./icon";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export function SearchInput({ label, className, ...rest }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
        <Icon name="search" className="h-[18px] w-[18px]" />
      </span>
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-11 w-full rounded-xl bg-search-bar pl-10 pr-3 text-base text-fg outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-accent"
        {...rest}
      />
    </div>
  );
}
