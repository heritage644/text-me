import { memo } from "react";
import { Avatar } from "../../../components/ui/avatar";
import { Icon } from "../../../components/ui/icon";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { formatBytes, formatTime } from "../../../lib/format";
import type { Attachment, Message, MessageStatus } from "../../../types/types";

const IMAGE_MAX_W = 280;
const IMAGE_MAX_H = 320;
const IMAGE_MIN_PX = 120;

/** Fit an image into the bubble's box, keeping its aspect ratio (unknown sizes get a square). */
function imageBox(width: number | null, height: number | null) {
  if (!width || !height) return { w: IMAGE_MAX_W, h: IMAGE_MAX_W };
  const scale = Math.min(IMAGE_MAX_W / width, IMAGE_MAX_H / height, Math.max(1, IMAGE_MIN_PX / Math.min(width, height)));
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

function StatusIcon({ status }: { status: MessageStatus }) {
  const label = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Not delivered" }[status];
  return (
    <>
      {status === "sending" && <Icon name="clock" className="h-3.5 w-3.5" />}
      {status === "sent" && <Icon name="check" className="h-3.5 w-3.5" />}
      {(status === "delivered" || status === "read") && (
        <Icon name="checks" className={cn("h-3.5 w-4", status === "read" ? "text-fg" : "text-fg/60")} />
      )}
      <span className="sr-only">{label}</span>
    </>
  );
}

/** Images reserve their final size up front (width/height + aspect-ratio) so nothing jumps when they load. */
function AttachmentView({ attachment, isOwn }: { attachment: Attachment; isOwn: boolean }) {
  if (attachment.mime.startsWith("image/")) {
    const { w, h } = imageBox(attachment.width, attachment.height);
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className={cn("block overflow-hidden rounded-2xl", focusRing)}>
        <img
          src={attachment.url}
          alt={attachment.name}
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
          className="block max-w-full bg-search-bar object-cover"
          style={{ aspectRatio: `${w} / ${h}` }}
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className={cn("flex min-h-11 items-center gap-3 rounded-xl px-1 py-1", focusRing)}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isOwn ? "bg-fg/15" : "bg-screen")}>
        <Icon name="file" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{attachment.name}</span>
        <span className={cn("block text-xs", isOwn ? "text-fg/70" : "text-fg-muted")}>{formatBytes(attachment.size)}</span>
      </span>
    </a>
  );
}

export type BubbleProps = {
  message: Message;
  isOwn: boolean;
  /** Group chats: sender name on the first bubble of a run. */
  senderName: string | null;
  /** Group chats: sender avatar next to the last bubble of a run (primitives keep memo effective). */
  avatarName: string | null;
  avatarSrc: string | null;
  /** Reserve the avatar column (incoming messages in groups). */
  avatarGutter: boolean;
  groupStart: boolean;
  groupEnd: boolean;
  onRetry: (message: Message) => void;
};

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  senderName,
  avatarName,
  avatarSrc,
  avatarGutter,
  groupStart,
  groupEnd,
  onRetry,
}: BubbleProps) {
  const hasBody = message.body.trim().length > 0;
  const onlyMedia = !hasBody && message.attachments.length > 0;
  const time = formatTime(message.createdAt);
  const meta = (
    <span className={cn("flex items-center gap-1 text-[11px] leading-none", isOwn ? "text-fg/70" : "text-fg-muted")}>
      {message.editedAt && <span>edited</span>}
      <time dateTime={message.createdAt}>{time}</time>
      {isOwn && <StatusIcon status={message.status} />}
    </span>
  );

  return (
    <div className={cn("flex items-end gap-2 px-3 md:px-4", isOwn ? "justify-end" : "justify-start", groupStart ? "pt-2" : "pt-0.5")}>
      {avatarGutter && (
        <span className="w-7 shrink-0">{avatarName && <Avatar name={avatarName} src={avatarSrc} size={28} />}</span>
      )}
      <div className={cn("flex max-w-[80%] flex-col md:max-w-[65%]", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative rounded-[20px] text-[15px] leading-snug transition-opacity duration-150",
            onlyMedia ? "p-1" : "px-3.5 py-2",
            isOwn ? "bg-accent text-fg" : "bg-pill text-fg",
            // Bubbles in a run share flatter inner corners; the last one gets the sharpest "tail" corner.
            isOwn
              ? cn(!groupStart && "rounded-tr-md", groupEnd ? "rounded-br-sm" : "rounded-br-md")
              : cn(!groupStart && "rounded-tl-md", groupEnd ? "rounded-bl-sm" : "rounded-bl-md"),
            message.status === "sending" && "opacity-80",
          )}
        >
          {senderName && <p className={cn("mb-0.5 text-xs font-semibold text-accent-bright", onlyMedia && "px-2.5 pt-1.5")}>{senderName}</p>}
          {message.attachments.length > 0 && (
            <div className={cn("flex flex-col gap-1", hasBody && "mb-1.5")}>
              {message.attachments.map((a) => (
                <AttachmentView key={a.id} attachment={a} isOwn={isOwn} />
              ))}
            </div>
          )}
          {hasBody ? (
            <p className="whitespace-pre-wrap break-words">
              {message.body}
              {/* Floated meta sits on the last line when it fits and wraps below when it doesn't. */}
              <span className="float-right ml-2.5 mt-[7px]">{meta}</span>
            </p>
          ) : (
            <span className="absolute bottom-2.5 right-3 rounded-full bg-screen/60 px-1.5 py-1">{meta}</span>
          )}
        </div>
        {message.status === "failed" && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className={cn("mt-1 flex min-h-11 items-center gap-1 rounded-lg px-1 text-xs font-medium text-badge-alert", focusRing)}
          >
            <Icon name="alert" className="h-4 w-4" />
            Not delivered. Tap to retry
          </button>
        )}
      </div>
    </div>
  );
});
