import type { Attachment, Chat, Message } from "../../types/types";

export function chatPeer(chat: Chat, meId: string) {
  if (chat.type !== "direct") return undefined;
  return chat.members.find((m) => m.id !== meId) ?? chat.members[0];
}

export function chatTitle(chat: Chat, meId: string) {
  if (chat.type === "group") return chat.name || "Untitled group";
  return chatPeer(chat, meId)?.name ?? "Unknown";
}

export function chatAvatar(chat: Chat, meId: string) {
  return chat.type === "group" ? chat.avatarUrl : (chatPeer(chat, meId)?.avatarUrl ?? null);
}

export const firstName = (name: string) => name.split(/\s+/)[0];

export function attachmentLabel(attachments: Attachment[]) {
  if (!attachments.length) return "";
  if (attachments.every((a) => a.mime.startsWith("image/"))) {
    return attachments.length > 1 ? `${attachments.length} photos` : "Photo";
  }
  return attachments.length > 1 ? `${attachments.length} files` : attachments[0].name;
}

/** "You: …", "Amaka: …" (groups) or just the body. */
export function messagePreview(message: Message, chat: Chat, meId: string) {
  const body = message.body || attachmentLabel(message.attachments);
  if (message.senderId === meId) return `You: ${body}`;
  if (chat.type === "group") {
    const sender = chat.members.find((m) => m.id === message.senderId);
    if (sender) return `${firstName(sender.name)}: ${body}`;
  }
  return body;
}

export function memberName(chat: Chat, userId: string) {
  return chat.members.find((m) => m.id === userId)?.name ?? "Someone";
}
