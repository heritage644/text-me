import type { ApiErrorBody } from "../types/types";

/**
 * How a request failed, so the UI can react to each failure differently
 * (e.g. retry network errors, map `validation` fields onto inputs).
 */
export type ApiErrorKind =
  | "offline"
  | "timeout"
  | "network"
  | "aborted"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "client"
  | "server";

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  offline: "You're offline. Check your connection and try again.",
  timeout: "The server took too long to respond. Try again.",
  network: "Couldn't reach the server. Try again.",
  aborted: "Request cancelled.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  not_found: "We couldn't find what you were looking for.",
  conflict: "That conflicts with existing data.",
  validation: "Please check the highlighted fields.",
  rate_limited: "Too many attempts. Wait a moment and try again.",
  client: "Something about that request wasn't right.",
  server: "Something went wrong on our side. Try again shortly.",
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(kind: ApiErrorKind, opts: { status?: number; code?: string; message?: string; fields?: Record<string, string> } = {}) {
    super(opts.message || DEFAULT_MESSAGES[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts.status ?? 0;
    this.code = opts.code ?? kind.toUpperCase();
    this.fields = opts.fields ?? {};
  }

  get hasFieldErrors() {
    return Object.keys(this.fields).length > 0;
  }

  /** Network-level and 5xx failures are worth retrying; 4xx are not. */
  get isRetryable() {
    return this.kind === "network" || this.kind === "timeout" || this.kind === "server" || this.kind === "offline";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(error: unknown) {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return DEFAULT_MESSAGES.server;
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422 || status === 400) return "validation";
  if (status === 429) return "rate_limited";
  // Gateway errors mean the app server is down or unreachable behind a proxy/load balancer.
  if (status === 502 || status === 503) return "network";
  if (status === 504) return "timeout";
  if (status >= 500) return "server";
  return "client";
}

/**
 * Parses an error body into the standard `{ error: { code, message, fields } }` shape.
 * Also accepts the legacy `{ message, errors: [{ field, message }] }` (Zod) shape
 * the current backend returns, so both work during migration.
 */
export function parseErrorBody(body: unknown): Partial<ApiErrorBody> {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  if (b.error && typeof b.error === "object") return b.error as ApiErrorBody;
  if (Array.isArray(b.errors)) {
    const fields: Record<string, string> = {};
    for (const e of b.errors as Array<{ field?: string; path?: string[]; message?: string }>) {
      const key = e.field ?? e.path?.join(".");
      if (key && e.message) fields[key] = e.message;
    }
    return { message: typeof b.message === "string" ? b.message : undefined, fields };
  }
  if (typeof b.message === "string") return { message: b.message, code: typeof b.code === "string" ? b.code : undefined };
  return {};
}

export async function errorFromResponse(res: Response) {
  const body = await res.json().catch(() => null);
  const { code, message, fields } = parseErrorBody(body);
  const kind = kindFromStatus(res.status);
  // A 400 without field errors is a generic client error, not a validation error.
  const resolvedKind = kind === "validation" && !fields ? "client" : kind;
  return new ApiError(resolvedKind, { status: res.status, code, message, fields });
}
