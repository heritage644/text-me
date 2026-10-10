import { Icon } from "../../../components/ui/icon";
import { Spinner } from "../../../components/ui/spinner";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatBytes } from "../../../lib/format";
import type { PendingUpload } from "../use-uploads";

type AttachmentTrayProps = {
  uploads: PendingUpload[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

/** Thumbnails of picked files above the composer, with upload progress and errors. */
export function AttachmentTray({ uploads, onRemove, onRetry }: AttachmentTrayProps) {
  return (
    <ul aria-label="Attachments" className="flex gap-2 overflow-x-auto px-1 pb-2">
      {uploads.map((u) => (
        <li key={u.id} className="relative shrink-0">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-search-bar",
              u.status === "error" ? "border-badge-alert" : "border-divider",
            )}
            title={`${u.file.name} (${formatBytes(u.file.size)})`}
          >
            {u.previewUrl ? (
              <img src={u.previewUrl} alt={u.file.name} width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-0.5 px-1 text-fg-muted">
                <Icon name="file" className="h-5 w-5" />
                <span className="w-14 truncate text-center text-[10px]">{u.file.name}</span>
              </span>
            )}
            {u.status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-screen/50 text-fg">
                <Spinner className="h-5 w-5" label={`Uploading ${u.file.name}`} />
              </span>
            )}
            {u.status === "error" && (
              <button
                type="button"
                onClick={() => onRetry(u.id)}
                aria-label={`Retry uploading ${u.file.name}: ${u.error ?? "failed"}`}
                className={cn("absolute inset-0 flex items-center justify-center rounded-xl bg-screen/60 text-badge-alert", focusRing)}
              >
                <Icon name="refresh" className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(u.id)}
            aria-label={`Remove ${u.file.name}`}
            className={cn("absolute -right-2.5 -top-2.5 flex h-8 w-8 items-center justify-center rounded-full", focusRing)}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-divider bg-pill text-fg">
              <Icon name="close" className="h-3 w-3" strokeWidth={3} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
