import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "../types/types";
import { http, refreshAccessToken, tokens } from "./client";
import { endpoints } from "./endpoints";
import { toAuth } from "./normalize";

/**
 * POST /auth/login — public.
 * Sets the refresh cookie and returns `{ accessToken, user }`.
 * Errors: 401 INVALID_CREDENTIALS, 422 VALIDATION (fields), 429.
 */
export async function login(body: LoginRequest): Promise<AuthResponse> {
  const auth = toAuth(await http.post(endpoints.auth.login, body, { auth: false }));
  tokens.set(auth.accessToken);
  return auth;
}

/**
 * POST /auth/register — public. Creates the account and signs it in.
 * Errors: 409 with fields `{ email | username }` when taken, 422 VALIDATION.
 */
export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const auth = toAuth(await http.post(endpoints.auth.register, body, { auth: false }));
  tokens.set(auth.accessToken);
  return auth;
}

/** POST /auth/logout — clears the refresh cookie server-side. Local state is cleared even if it fails. */
export async function logout(): Promise<void> {
  try {
    await http.post(endpoints.auth.logout, undefined, { auth: false });
  } finally {
    tokens.set(null);
  }
}

/** POST /auth/refresh — cookie-authenticated; returns a new access token. */
export function refresh(): Promise<string> {
  return refreshAccessToken();
}

/** POST /auth/forgot-password — always 204 (never reveals whether the email exists). */
export async function forgotPassword(body: ForgotPasswordRequest): Promise<void> {
  await http.post(endpoints.auth.forgotPassword, body, { auth: false });
}

/** POST /auth/reset-password — `{ token, password }`. Errors: 400 INVALID_TOKEN / TOKEN_EXPIRED, 422. */
export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await http.post(endpoints.auth.resetPassword, body, { auth: false });
}
