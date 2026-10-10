import { cn } from "../../lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center">
      <svg viewBox="0 0 24 24" className={cn("h-5 w-5 motion-safe:animate-spin", className)} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="stroke-current opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-current" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
