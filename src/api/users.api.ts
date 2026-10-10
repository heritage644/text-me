import type { ChangePasswordRequest, CurrentUser, Page, UpdateProfileRequest, User, UserSearchParams } from "../types/types";
import { http } from "./client";
import { endpoints } from "./endpoints";
import { toCurrentUser, toPage, toUser, unwrap } from "./normalize";

/** GET /users/me → CurrentUser. */
export async function getMe(): Promise<CurrentUser> {
  return toCurrentUser(unwrap(await http.get(endpoints.users.me)));
}

/** PATCH /users/me — partial profile/notification update → CurrentUser. Errors: 409 `fields.username`, 422. */
export async function updateMe(body: UpdateProfileRequest): Promise<CurrentUser> {
  return toCurrentUser(unwrap(await http.patch(endpoints.users.me, body)));
}

/** POST /users/me/password → 204. Errors: 422 `fields.currentPassword` when wrong. */
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await http.post(endpoints.users.myPassword, body);
}

/** GET /users?search=&cursor=&limit= → Page<User>. Empty search returns the user's contacts. */
export async function searchUsers({ search, cursor, limit = 30 }: UserSearchParams): Promise<Page<User>> {
  return toPage(await http.get(endpoints.users.search, { query: { search, cursor, limit } }), toUser);
}

/** POST /users/:id/block → 204. */
export async function blockUser(userId: string): Promise<void> {
  await http.post(endpoints.users.block(userId));
}

/** DELETE /users/:id/block → 204. */
export async function unblockUser(userId: string): Promise<void> {
  await http.delete(endpoints.users.block(userId));
}
