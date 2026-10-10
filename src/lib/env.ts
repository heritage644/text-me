/** Turn a relative socket path ("/ws") into an absolute ws:// or wss:// URL on the current origin. */
function resolveSocketUrl(value: string) {
  if (!value || /^wss?:\/\//.test(value)) return value;
  const url = new URL(value, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/** Typed access to build-time config. Never read `import.meta.env` anywhere else. */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, ""),
  wsUrl: resolveSocketUrl(import.meta.env.VITE_WS_URL ?? ""),
  useMocks: import.meta.env.VITE_USE_MOCKS === "true",
} as const;
