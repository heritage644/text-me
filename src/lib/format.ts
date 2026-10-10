const DAY_MS = 86_400_000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days between `iso` and today (0 = today, 1 = yesterday). */
function daysAgo(iso: string, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
}

export function isSameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Chat list timestamp: "09:41", "Yesterday", "Mon", "03/03/26". */
export function formatChatTimestamp(iso: string) {
  const days = daysAgo(iso);
  if (days === 0) return formatTime(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(iso).toLocaleDateString([], { weekday: "short" });
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Thread date separator: "Today", "Yesterday", "Monday", "Tue, 3 Mar 2026". */
export function formatDayLabel(iso: string) {
  const days = daysAgo(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(iso).toLocaleDateString([], { weekday: "long" });
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatLastSeen(online: boolean, lastSeenAt: string | null) {
  if (online) return "online";
  if (!lastSeenAt) return "last seen recently";
  const days = daysAgo(lastSeenAt);
  if (days === 0) return `last seen today at ${formatTime(lastSeenAt)}`;
  if (days === 1) return `last seen yesterday at ${formatTime(lastSeenAt)}`;
  return `last seen ${formatChatTimestamp(lastSeenAt)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
