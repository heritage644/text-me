/** Fake auth for mock mode. sessionStorage stands in for the httpOnly refresh cookie. */
export const SESSION_KEY = "textme:mock-session";

/** Short TTL so the 401 → refresh → retry flow is exercised during a demo. */
const ACCESS_TOKEN_TTL_MS = 2 * 60_000;

export function issueToken() {
  return `mock.${Date.now() + ACCESS_TOKEN_TTL_MS}`;
}

export function isTokenValid(token: string | null | undefined) {
  const expires = Number(token?.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now();
}
