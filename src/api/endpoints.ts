/** Every REST path the app calls, relative to `VITE_API_BASE_URL`. */
const enc = encodeURIComponent;

export const endpoints = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  users: {
    me: "/users/me",
    myPassword: "/users/me/password",
    search: "/users",
    block: (userId: string) => `/users/${enc(userId)}/block`,
  },
  chats: {
    list: "/chats",
    detail: (chatId: string) => `/chats/${enc(chatId)}`,
    members: (chatId: string) => `/chats/${enc(chatId)}/members`,
    member: (chatId: string, userId: string) => `/chats/${enc(chatId)}/members/${enc(userId)}`,
    messages: (chatId: string) => `/chats/${enc(chatId)}/messages`,
    read: (chatId: string) => `/chats/${enc(chatId)}/read`,
    media: (chatId: string) => `/chats/${enc(chatId)}/media`,
  },
  messages: {
    detail: (messageId: string) => `/messages/${enc(messageId)}`,
  },
  uploads: "/uploads",
} as const;
