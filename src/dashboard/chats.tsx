import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Contact,Chat } from "../types/types";





const INITIAL_CHATS: Chat[] = [
  {
    contact: { id: "1", name: "Amaka Obi", username: "amaka_o", online: true, lastSeen: "online" },
    unread: 2,
    messages: [
      { id: "m1", from: "them", text: "Hey, you don reach?", time: "09:41" },
      { id: "m2", from: "me", text: "Almost. Traffic dey Third Mainland.", time: "09:43" },
      { id: "m3", from: "them", text: "Ok o. I go wait for you.", time: "09:44" },
      { id: "m4", from: "them", text: "Abeg buy water for me.", time: "09:44" },
    ],
  },
  {
    contact: { id: "2", name: "Tunde Bakare", username: "tunde_b", online: false, lastSeen: "last seen today at 08:12" },
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Did you push the auth changes?", time: "Yesterday" },
      { id: "m2", from: "them", text: "Yes. Check the main branch.", time: "Yesterday" },
    ],
  },
  {
    contact: { id: "3", name: "Chidi Eze", username: "chidi_e", online: true, lastSeen: "online" },
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "Football tonight?", time: "Mon" }],
  },
  {
    contact: { id: "4", name: "Bisi Adeyemi", username: "bisi_a", online: false, lastSeen: "last seen recently" },
    unread: 5,
    messages: [{ id: "m1", from: "them", text: "Send me the designs when you can.", time: "Sun" }],
  },
];

/* ---------- Small helpers ---------- */
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
];

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Icon({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  back: "M15 18l-6-6 6-6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  clip: "M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
  more: "M12 5v.01M12 12v.01M12 19v.01",
  pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
  check: "M20 6L9 17l-5-5",
};

const iconBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/10 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent";

function Avatar({ contact, size = "h-12 w-12" }: { contact: Contact; size?: string }) {
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="relative shrink-0">
      <div
        className={`${size} ${colorFor(contact.id)} flex items-center justify-center rounded-full text-base font-semibold text-white`}
      >
        {initials}
      </div>
      {contact.online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-emerald-400" />
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function ChatDashboard() {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = chats.find((c) => c.contact.id === activeId) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(q) ||
        c.contact.username.toLowerCase().includes(q)
    );
  }, [chats, query]);

  // keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeId, active?.messages.length]);

  // Esc closes the open chat, like Telegram desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActiveId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openChat = (id: string) => {
    setActiveId(id);
    setChats((prev) => prev.map((c) => (c.contact.id === id ? { ...c, unread: 0 } : c)));
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    setChats((prev) =>
      prev.map((c) =>
        c.contact.id === activeId
          ? {
              ...c,
              messages: [...c.messages, { id: crypto.randomUUID(), from: "me", text, time: nowTime() }],
            }
          : c
      )
    );
    setDraft("");
  };

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-screen text-fg">
      {/* ===== Sidebar: contacts only ===== */}
      <aside
        className={`${activeId ? "hidden md:flex" : "flex"} relative w-full flex-col border-r border-white/10 md:w-80 lg:w-[22rem] xl:w-96`}
      >
        <header className="flex items-center gap-2 px-3 py-3">
          <button type="button" aria-label="Menu" className={iconBtn}>
            <Icon d={ICONS.menu} />
          </button>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted">
              <Icon d={ICONS.search} className="h-5 w-5" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts"
              className="w-full rounded-full bg-white/10 py-2.5 pl-11 pr-4 text-base text-fg outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        </header>

        <ul className="flex-1 overflow-y-auto px-2 pb-24 md:pb-4">
          {visible.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-fg-muted">
              No contact matches “{query}”.
            </li>
          )}
          {visible.map(({ contact, messages, unread }) => {
            const last = messages[messages.length - 1];
            const isActive = contact.id === activeId;
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => openChat(contact.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? "bg-accent text-white" : "hover:bg-white/5"
                  }`}
                >
                  <Avatar contact={contact} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{contact.name}</span>
                      <span className={`shrink-0 text-xs ${isActive ? "text-white/80" : "text-fg-muted"}`}>
                        {last?.time}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${isActive ? "text-white/80" : "text-fg-muted"}`}>
                        {last?.from === "me" && "You: "}
                        {last?.text}
                      </span>
                      {unread > 0 && (
                        <span
                          className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                            isActive ? "bg-white text-accent" : "bg-accent text-white"
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* New chat button */}
        <button
          type="button"
          aria-label="Start a new chat"
          className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
        >
          <Icon d={ICONS.pencil} />
        </button>
      </aside>

      {/* ===== Conversation ===== */}
      <section className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {active ? (
          <>
            <header className="flex items-center gap-2 border-b border-white/10 px-2 py-2.5 md:px-4">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
                className={`${iconBtn} md:hidden`}
              >
                <Icon d={ICONS.back} />
              </button>
              <Avatar contact={active.contact} size="h-10 w-10" />
              <div className="min-w-0 flex-1 leading-tight">
                <h1 className="truncate font-semibold">{active.contact.name}</h1>
                <p className={`truncate text-sm ${active.contact.online ? "text-accent" : "text-fg-muted"}`}>
                  {active.contact.lastSeen}
                </p>
              </div>
              <button type="button" aria-label="Search in chat" className={`${iconBtn} hidden sm:flex`}>
                <Icon d={ICONS.search} className="h-5 w-5" />
              </button>
              <button type="button" aria-label="More options" className={iconBtn}>
                <Icon d={ICONS.more} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto bg-black/20 px-3 py-4 md:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                {active.messages.map((m) => {
                  const mine = m.from === "me";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 md:max-w-[70%] ${
                          mine
                            ? "rounded-br-md bg-accent text-white"
                            : "rounded-bl-md bg-white/10 text-fg"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.text}</p>
                        <p
                          className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
                            mine ? "text-white/70" : "text-fg-muted"
                          }`}
                        >
                          {m.time}
                          {mine && <Icon d={ICONS.check} className="h-3 w-3" />}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-white/10 px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4"
            >
              <button type="button" aria-label="Attach a file" className={iconBtn}>
                <Icon d={ICONS.clip} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message"
                className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-base text-fg outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-accent"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon d={ICONS.send} className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-black/20 p-6">
            <p className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-fg-muted">
              Select a contact to start chatting
            </p>
          </div>
        )}
      </section>
    </main>
  );
}