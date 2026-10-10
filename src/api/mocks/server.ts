/** A `fetch`-compatible transport that answers requests from the in-memory db. */
import { env } from "../../lib/env";
import { routes } from "./handlers";
import { isTokenValid } from "./session";

/** Set `sessionStorage["textme:mock-fail"] = "/chats"` to make matching paths return 500 (to preview error states). */
const FAIL_KEY = "textme:mock-fail";

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function delay(signal: AbortSignal | null | undefined) {
  const ms = 250 + Math.random() * 350;
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export async function mockFetch(input: string, init: RequestInit = {}): Promise<Response> {
  await delay(init.signal);

  const url = new URL(input, window.location.origin);
  const basePath = new URL(env.apiBaseUrl || "/", window.location.origin).pathname.replace(/\/$/, "");
  const path = url.pathname.slice(basePath.length) || "/";
  const method = (init.method ?? "GET").toUpperCase();

  const failPath = sessionStorage.getItem(FAIL_KEY);
  if (failPath && path.startsWith(failPath)) {
    return json(500, { error: { code: "INTERNAL", message: "Mock failure (textme:mock-fail is set)." } });
  }

  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.pattern.exec(path);
    if (!match) continue;

    if (!r.isPublic) {
      const token = new Headers(init.headers).get("Authorization")?.replace(/^Bearer /, "");
      if (!isTokenValid(token)) return json(401, { error: { code: "TOKEN_EXPIRED", message: "Access token expired." } });
    }

    const params = Object.fromEntries(r.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
    const form = init.body instanceof FormData ? init.body : null;
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const result = await r.handler({ params, query: url.searchParams, body, form });
    return json(result.status, result.body);
  }

  return json(404, { error: { code: "NOT_FOUND", message: `No mock handler for ${method} ${path}` } });
}
