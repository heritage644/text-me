import { Spinner } from "./ui/spinner";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useConnectionState } from "../realtime/use-socket-event";

/** Small status pill shown only while realtime is unavailable. */
export function ConnectionPill() {
  const online = useOnlineStatus();
  const state = useConnectionState();

  const label = !online || state === "offline" ? "Waiting for network" : state === "connecting" || state === "reconnecting" ? "Connecting…" : null;
  if (!label) return null;

  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-pill px-2.5 py-1 text-xs font-medium text-fg-faint">
      {online && <Spinner className="h-3 w-3" />}
      {label}
    </span>
  );
}
