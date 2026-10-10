import { Skeleton } from "../../../components/ui/skeleton";

export function UserListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex min-h-16 items-center gap-3 pl-4">
          <Skeleton shape="circle" className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2 self-stretch border-b border-divider py-3 pr-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
