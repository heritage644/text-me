import { NavLink } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Icon, type IconName } from "../components/ui/icon";
import { cn } from "../lib/cn";
import { useChats } from "../features/chats/hooks";

const TABS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/chats", label: "Chats", icon: "chats" },
  { to: "/contacts", label: "Contacts", icon: "contacts" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

/** Floating translucent tab bar pinned to the bottom of the list pane. */
export function BottomNav() {
  const { chats } = useChats();
  const unreadChats = chats.filter((c) => c.unreadCount > 0 && !c.muted).length;

  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border border-divider bg-nav backdrop-blur-xl"
    >
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent",
                  isActive ? "text-icon-active" : "text-icon-inactive hover:text-fg",
                )
              }
            >
              <span className="relative">
                <Icon name={tab.icon} className="h-6 w-6" />
                {tab.to === "/chats" && unreadChats > 0 && (
                  <span className="absolute -right-3 -top-1.5">
                    <Badge count={unreadChats} tone="alert" label={`${unreadChats} unread chats`} />
                  </span>
                )}
              </span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
