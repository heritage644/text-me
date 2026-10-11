/** Turn a relative socket path ("/ws") into an absolute ws:// or wss:// URL on the current origin. */
function resolveSocketUrl(value: string) {
  if (!value || /^wss?:\/\//.test(value)) return value;
  const url = new URL(value, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/** Typed access to build-time config. Never read `import.meta.env` anywhere else. */
export const env = {
  /** REST base URL. A path like `/api` is resolved against the page origin by the browser. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, ""),
  /** Absolute `ws://`/`wss://` URL. Empty means realtime updates are disabled. */
  wsUrl: resolveSocketUrl(import.meta.env.VITE_WS_URL ?? ""),
} as const;

/**
 * Fail loudly during development when the API isn't configured: without this the
 * only symptom is a stream of "Couldn't reach the server" toasts.
 */
if (import.meta.env.DEV && !env.apiBaseUrl) {
  console.warn(
    "[Text-ME] VITE_API_BASE_URL is not set. Set it in .env.development.local (e.g. VITE_API_BASE_URL=/api) " +
      "and point DEV_PROXY_TARGET at your backend.",
  );
}
