import { cn } from "../../lib/cn";

const SHAPES = {
  line: "rounded-md",
  circle: "rounded-full",
  tile: "rounded-lg",
  bubble: "rounded-[20px]",
} as const;

export function Skeleton({ className, shape = "line" }: { className?: string; shape?: keyof typeof SHAPES }) {
  return <span aria-hidden="true" className={cn("block bg-pill motion-safe:animate-pulse", SHAPES[shape], className)} />;
}
