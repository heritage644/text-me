import type {
  CreateTagRequest,
  Message,
  Page,
  Tag,
  TaggedMessageParams,
  UpdateTagRequest,
} from "../types/types";
import { http } from "./client";
import { endpoints } from "./endpoints";
import { toMessage, toPage, toTag, unwrap } from "./normalize";

/**
 * Tags are personal: every call below acts on the *current user's* tags, so two
 * members of a group chat can tag the same message differently.
 */

/** GET /tags → Tag[], oldest first. */
export async function listTags(): Promise<Tag[]> {
  const raw = unwrap(await http.get(endpoints.tags.list));
  return (Array.isArray(raw) ? raw : (raw?.items ?? [])).map(toTag);
}

/** POST /tags `{ label, color }` → Tag. Errors: 409 `fields.label` (duplicate), 422. */
export async function createTag(body: CreateTagRequest): Promise<Tag> {
  return toTag(unwrap(await http.post(endpoints.tags.list, body)));
}

/** PATCH /tags/:id `{ label?, color? }` → Tag. */
export async function updateTag(tagId: string, body: UpdateTagRequest): Promise<Tag> {
  return toTag(unwrap(await http.patch(endpoints.tags.detail(tagId), body)));
}

/** DELETE /tags/:id → 204. Also removes the tag from every message that carries it. */
export async function deleteTag(tagId: string): Promise<void> {
  await http.delete(endpoints.tags.detail(tagId));
}

/**
 * PUT /messages/:id/tags `{ tagIds }` → Message.
 * The body is the *complete* set for that message: ids that are missing get removed.
 * Anyone may tag any message in a chat they belong to; only their own tag list changes.
 */
export async function setMessageTags(messageId: string, tagIds: string[]): Promise<Message> {
  return toMessage(unwrap(await http.put(endpoints.messages.tags(messageId), { tagIds })));
}

/**
 * GET /tags/:id/messages?chatId=&cursor=&limit= → Page<Message>, newest first.
 * Pass `chatId` to scope the search to one thread; omit it to search every chat.
 */
export async function listTaggedMessages(
  tagId: string,
  { chatId, cursor, limit = 30 }: TaggedMessageParams = {},
): Promise<Page<Message>> {
  return toPage(await http.get(endpoints.tags.messages(tagId), { query: { chatId, cursor, limit } }), toMessage);
}
