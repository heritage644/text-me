import { memo } from "react";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";

type AvatarProps = {
  name: string;
  src?: string | null;
  /** Diameter in px. Fixed dimensions avoid layout shift while the image loads. */
  size?: number;
  online?: boolean;
  className?: string;
};

export const Avatar = memo(function Avatar({ name, src, size = 48, online = false, className }: AvatarProps) {
  const dot = Math.max(10, Math.round(size * 0.26));
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-full bg-pill object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-full bg-pill font-semibold text-fg"
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          {initials(name) || "?"}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-status-active ring-2 ring-screen"
          style={{ width: dot, height: dot }}
        >
          <span className="sr-only">Online</span>
        </span>
      )}
    </span>
  );
});
