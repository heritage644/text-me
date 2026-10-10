import { Skeleton } from "../../../components/ui/skeleton";

export function ChatListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex min-h-[76px] items-center gap-3 pl-4">
          <Skeleton shape="circle" className="h-[52px] w-[52px] shrink-0" />
          <div className="flex flex-1 items-center gap-3 self-stretch border-b border-divider py-3 pr-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
            <Skeleton className="h-3 w-10 self-start" />
          </div>
        </li>
      ))}
    </ul>
  );
}
