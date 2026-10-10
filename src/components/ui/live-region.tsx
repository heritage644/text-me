import { useAnnouncer } from "./announcer";

/** Polite screen-reader region fed by `announce()`. Mounted once in App. */
export function LiveRegion() {
  const message = useAnnouncer((s) => s.message);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
