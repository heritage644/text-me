/**
 * In-memory "backend" state for mock mode, shared by the fake REST transport
 * and the fake socket so both stay consistent. Wire shapes match docs/API_CONTRACT.md.
 */
import { colors } from "../../styles/colors";
import type { Attachment, Chat, ChatMember, CurrentUser, Message, NotificationSettings, User } from "../../types/types";

type UserRecord = User & { email: string; notifications: NotificationSettings };

type ChatRecord = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatarUrl: string | null;
  memberIds: string[];
  adminIds: string[];
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  unreadCount: number;
  mentionCount: number;
  createdAt: string;
  updatedAt: string;
};

/* ── Deterministic randomness so fixtures look the same on every load ─── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(644);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

const MINUTE = 60_000;
const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();

/** Placeholder "photo" as an SVG data URL, drawn with the theme palette. */
export function placeholderImage(width: number, height: number, seed: number): string {
  const r = Math.min(width, height) / 5;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${colors.searchBar}"/>` +
    `<circle cx="${(width * (0.25 + (seed % 5) / 10)).toFixed(0)}" cy="${(height * 0.35).toFixed(0)}" r="${r}" fill="${colors.accent}" opacity=".85"/>` +
    `<path d="M0 ${height} L${width * 0.35} ${height * 0.55} L${width * 0.6} ${height * 0.8} L${width * 0.8} ${height * 0.6} L${width} ${height} Z" fill="${colors.pill}"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ── Users ──────────────────────────────────────────────────────────────── */

const notifications: NotificationSettings = { messages: true, groups: true, previews: true, sounds: false };

const PEOPLE: Array<[string, string, string]> = [
  ["u_amaka", "Amaka Obi", "amaka_o"],
  ["u_tunde", "Tunde Bakare", "tunde_b"],
  ["u_chidi", "Chidi Eze", "chidi_e"],
  ["u_bisi", "Bisi Adeyemi", "bisi_a"],
  ["u_ngozi", "Ngozi Uche", "ngozi"],
  ["u_emeka", "Emeka Nwosu", "emeka_n"],
  ["u_funmi", "Funmi Alade", "funmi"],
  ["u_kelechi", "Kelechi Ibe", "kc_ibe"],
  ["u_zainab", "Zainab Bello", "zainab_b"],
  ["u_segun", "Segun Ade", "segun"],
  ["u_ifeoma", "Ifeoma Okeke", "ify_okeke"],
  ["u_yusuf", "Yusuf Garba", "yusuf_g"],
  ["u_temi", "Temi Ojo", "temi_ojo"],
  ["u_dayo", "Dayo Martins", "dayo_m"],
];
const STATUSES = ["Available", "At work", "Busy, text me", "On the road", "Coding", ""];

export const ME_ID = "u_me";

const users = new Map<string, UserRecord>();
users.set(ME_ID, {
  id: ME_ID,
  name: "Ada Okafor",
  username: "ada",
  email: "ada@textme.app",
  avatarUrl: null,
  status: "Building Text-ME",
  online: true,
  lastSeenAt: null,
  notifications,
});
PEOPLE.forEach(([id, name, username], i) => {
  const online = i % 3 === 0;
  users.set(id, {
    id,
    name,
    username,
    email: `${username}@example.com`,
    avatarUrl: null,
    status: STATUSES[i % STATUSES.length],
    online,
    lastSeenAt: online ? null : ago((i + 1) * 47 * MINUTE),
    notifications,
  });
});

/* ── Chats & messages ───────────────────────────────────────────────────── */

const chats = new Map<string, ChatRecord>();
const messages = new Map<string, Message[]>();
const blocked = new Set<string>();
let seq = 0;
export const nextId = (prefix: string) => `${prefix}_${(++seq).toString(36)}${Math.floor(rand() * 1e6).toString(36)}`;

const LINES = [
  "You don reach?",
  "Almost there, traffic dey Third Mainland.",
  "Ok o, I go wait for you.",
  "Did you push the auth changes?",
  "Yes, check the main branch.",
  "Football tonight?",
  "Send me the designs when you can.",
  "Abeg call me when you're free.",
  "That's actually a great idea",
  "Lol 😂",
  "I'm on my way",
  "Can we move the meeting to 3pm?",
  "Sure, no wahala.",
  "Did you see the match yesterday??",
  "The new build is so much faster",
  "Let me check and get back to you",
  "Where are we meeting?",
  "Haha you no serious",
  "Happy birthday!! 🎉",
  "I'll send the doc in a bit",
  "Sounds good 👍",
  "Na wa for this rain o",
  "Have you eaten?",
  "Thanks a lot, really appreciate it.",
  "We need to talk about the release plan before Friday. QA found two blockers in the login flow and one in notifications.",
];

function addChat(record: Omit<ChatRecord, "createdAt" | "updatedAt" | "adminIds" | "archived"> & { adminIds?: string[] }) {
  const full: ChatRecord = { archived: false, adminIds: record.adminIds ?? [ME_ID], createdAt: ago(60 * 24 * 60 * MINUTE), updatedAt: ago(0), ...record };
  chats.set(full.id, full);
  messages.set(full.id, []);
  return full;
}

/** Generates `count` messages spread over `spanMinutes`, ending `endMinutesAgo` ago. */
function seedMessages(chat: ChatRecord, count: number, spanMinutes: number, endMinutesAgo: number, script: Array<[string, string]> = []) {
  const list = messages.get(chat.id)!;
  const total = count + script.length;
  let t = now - (endMinutesAgo + spanMinutes) * MINUTE;
  const step = (spanMinutes * MINUTE) / Math.max(1, total);
  for (let i = 0; i < total; i++) {
    // Bursty timing: mostly quick replies, occasionally long gaps.
    t += rand() < 0.15 ? step * 4 * rand() : step * 0.6 * rand();
    t = Math.min(t, now - endMinutesAgo * MINUTE);
    const scripted = i >= count ? script[i - count] : null;
    const senderId = scripted ? scripted[0] : rand() < 0.45 ? ME_ID : pick(chat.memberIds.filter((m) => m !== ME_ID));
    const withImage = !scripted && rand() < 0.04;
    const width = rand() < 0.5 ? 640 : 480;
    const height = width === 640 ? 480 : 640;
    const attachments: Attachment[] = withImage
      ? [{ id: nextId("att"), url: placeholderImage(width, height, i), mime: "image/svg+xml", size: 48_000 + i * 31, name: `IMG_${2000 + i}.jpg`, width, height }]
      : [];
    list.push({
      id: nextId("msg"),
      chatId: chat.id,
      senderId,
      body: scripted ? scripted[1] : withImage && rand() < 0.5 ? "" : pick(LINES),
      attachments,
      status: "read",
      createdAt: new Date(t).toISOString(),
      editedAt: null,
    });
  }
  const last = list.at(-1);
  if (last?.senderId === ME_ID) last.status = "delivered";
  if (last) chat.updatedAt = last.createdAt;
}

const amaka = addChat({ id: "c_amaka", type: "direct", name: null, avatarUrl: null, memberIds: [ME_ID, "u_amaka"], pinned: true, muted: false, unreadCount: 2, mentionCount: 0 });
seedMessages(amaka, 420, 60 * 24 * 21, 3, [
  ["u_amaka", "Hey, you don reach?"],
  [ME_ID, "Almost. Traffic dey Third Mainland."],
  ["u_amaka", "Ok o. I go wait for you."],
  ["u_amaka", "Abeg buy water for me."],
]);

const devs = addChat({ id: "c_devs", type: "group", name: "Lagos Devs", avatarUrl: null, memberIds: [ME_ID, "u_tunde", "u_chidi", "u_emeka", "u_funmi"], adminIds: ["u_tunde"], pinned: true, muted: false, unreadCount: 5, mentionCount: 1 });
seedMessages(devs, 60, 60 * 24 * 4, 12, [["u_tunde", "@ada can you review the socket PR before standup?"]]);

const tunde = addChat({ id: "c_tunde", type: "direct", name: null, avatarUrl: null, memberIds: [ME_ID, "u_tunde"], pinned: false, muted: false, unreadCount: 0, mentionCount: 0 });
seedMessages(tunde, 24, 60 * 24 * 3, 60 * 20, [[ME_ID, "Did you push the auth changes?"], ["u_tunde", "Yes. Check the main branch."]]);

const family = addChat({ id: "c_family", type: "group", name: "Family", avatarUrl: null, memberIds: [ME_ID, "u_ngozi", "u_kelechi", "u_ifeoma"], pinned: false, muted: true, unreadCount: 12, mentionCount: 0 });
seedMessages(family, 80, 60 * 24 * 6, 45);

const chidi = addChat({ id: "c_chidi", type: "direct", name: null, avatarUrl: null, memberIds: [ME_ID, "u_chidi"], pinned: false, muted: false, unreadCount: 1, mentionCount: 0 });
seedMessages(chidi, 12, 60 * 24 * 5, 60 * 30, [["u_chidi", "Football tonight?"]]);

const bisi = addChat({ id: "c_bisi", type: "direct", name: null, avatarUrl: null, memberIds: [ME_ID, "u_bisi"], pinned: false, muted: false, unreadCount: 3, mentionCount: 0 });
seedMessages(bisi, 16, 60 * 24 * 7, 60 * 24 * 2, [["u_bisi", "Send me the designs when you can."]]);

const football = addChat({ id: "c_football", type: "group", name: "Weekend Football", avatarUrl: null, memberIds: [ME_ID, "u_segun", "u_yusuf", "u_dayo", "u_chidi", "u_emeka"], adminIds: ["u_segun"], pinned: false, muted: true, unreadCount: 0, mentionCount: 0 });
seedMessages(football, 40, 60 * 24 * 10, 60 * 24 * 3);

for (const [id, peer, days] of [["c_ngozi", "u_ngozi", 4], ["c_zainab", "u_zainab", 9], ["c_funmi", "u_funmi", 13], ["c_kelechi", "u_kelechi", 20]] as const) {
  const chat = addChat({ id, type: "direct", name: null, avatarUrl: null, memberIds: [ME_ID, peer], pinned: false, muted: false, unreadCount: 0, mentionCount: 0 });
  seedMessages(chat, 10, 60 * 24 * 2, 60 * 24 * days);
}

/* ── Accessors used by handlers and the mock socket ─────────────────────── */

export const db = {
  users,
  chats,
  messages,
  blocked,

  me(): CurrentUser {
    return { ...users.get(ME_ID)! };
  },

  publicUser(id: string): User {
    const u = users.get(id)!;
    return { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl, status: u.status, online: u.online, lastSeenAt: u.lastSeenAt };
  },

  serializeChat(record: ChatRecord): Chat {
    const list = messages.get(record.id) ?? [];
    const members: ChatMember[] = record.memberIds
      .filter((id) => users.has(id))
      .map((id) => ({ ...db.publicUser(id), role: record.adminIds.includes(id) ? "admin" : "member" }));
    const peer = record.type === "direct" ? record.memberIds.find((id) => id !== ME_ID) : undefined;
    return {
      id: record.id,
      type: record.type,
      name: record.name,
      avatarUrl: record.avatarUrl,
      members,
      lastMessage: list.at(-1) ?? null,
      unreadCount: record.unreadCount,
      mentionCount: record.mentionCount,
      pinned: record.pinned,
      muted: record.muted,
      archived: record.archived,
      blocked: peer ? blocked.has(peer) : false,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  },

  createChat(input: { type: "direct" | "group"; memberIds: string[]; name?: string | null; avatarUrl?: string | null }) {
    const record: ChatRecord = {
      id: nextId("c"),
      type: input.type,
      name: input.type === "group" ? (input.name ?? "New group") : null,
      avatarUrl: input.avatarUrl ?? null,
      memberIds: [ME_ID, ...input.memberIds.filter((id) => id !== ME_ID)],
      adminIds: [ME_ID],
      pinned: false,
      muted: false,
      archived: false,
      unreadCount: 0,
      mentionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chats.set(record.id, record);
    messages.set(record.id, []);
    return record;
  },

  addMessage(chatId: string, senderId: string, body: string, attachments: Attachment[] = [], tempId?: string): Message {
    const list = messages.get(chatId)!;
    const existing = tempId ? list.find((m) => m.tempId === tempId) : undefined;
    if (existing) return existing;
    const message: Message = {
      id: nextId("msg"),
      chatId,
      senderId,
      body,
      attachments,
      status: "sent",
      createdAt: new Date().toISOString(),
      editedAt: null,
      ...(tempId ? { tempId } : {}),
    };
    list.push(message);
    const chat = chats.get(chatId)!;
    chat.updatedAt = message.createdAt;
    chat.archived = false;
    if (senderId !== ME_ID) chat.unreadCount += 1;
    return message;
  },

  findMessage(messageId: string) {
    for (const list of messages.values()) {
      const index = list.findIndex((m) => m.id === messageId);
      if (index >= 0) return { list, index, message: list[index] };
    }
    return null;
  },
};

export type { ChatRecord, UserRecord };
