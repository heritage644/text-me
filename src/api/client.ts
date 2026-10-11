/**
 * The only module that performs HTTP requests.
 *
 * Auth strategy (isolated here so it's easy to change):
 *  - Short-lived access token kept in memory only, sent as `Authorization: Bearer`.
 *  - Long-lived refresh token in an httpOnly cookie, sent via `credentials: "include"`.
 *  - On 401: refresh once (single-flight: concurrent 401s share one refresh),
 *    retry the original request, and end the session if the refresh fails.
 */
import { env } from "../lib/env";
import { endpoints } from "./endpoints";
import { ApiError, errorFromResponse } from "./errors";
import { toAccessToken } from "./normalize";

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  /** Plain objects are sent as JSON; FormData is sent as multipart. */
  body?: unknown;
  signal?: AbortSignal;
  /** Attach the access token and handle 401s (default `true`). */
  auth?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

/* ── Access token (memory only) ─────────────────────────────────────────── */

let accessToken: string | null = null;

export const tokens = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

let handleSessionExpired: () => void = () => {};

/** Registered by the auth provider: clears the session when refresh fails. */
export function onSessionExpired(handler: () => void) {
  handleSessionExpired = handler;
}

/* ── Low-level send ─────────────────────────────────────────────────────── */

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = `${env.apiBaseUrl}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  if (!navigator.onLine) throw new ApiError("offline");

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort);

  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    if (timedOut) throw new ApiError("timeout");
    if (opts.signal?.aborted) throw new ApiError("aborted");
    throw new ApiError(navigator.onLine ? "network" : "offline");
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/* ── Refresh (single-flight) ────────────────────────────────────────────── */

let refreshInFlight: Promise<string> | null = null;

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= (async () => {
    const res = await send(endpoints.auth.refresh, { method: "POST" }, null);
    if (!res.ok) throw await errorFromResponse(res);
    const token = toAccessToken(await res.json());
    tokens.set(token);
    return token;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function expireSession() {
  tokens.set(null);
  handleSessionExpired();
}

/* ── Public request API ─────────────────────────────────────────────────── */

/** Performs a request and returns the parsed JSON body (raw, not yet normalised). */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  let res = await send(path, opts, useAuth ? tokens.get() : null);

  if (res.status === 401 && useAuth) {
    let token: string;
    try {
      token = await refreshAccessToken();
    } catch (error) {
      // A flaky network shouldn't log the user out; only a rejected refresh does.
      if (error instanceof ApiError && error.isRetryable) throw error;
      expireSession();
      throw new ApiError("unauthorized", { status: 401 });
    }
    res = await send(path, opts, token);
    if (res.status === 401) {
      expireSession();
      throw await errorFromResponse(res);
    }
  }

  if (!res.ok) throw await errorFromResponse(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  /** Replace a whole sub-resource (e.g. a message's tag set). */
  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
