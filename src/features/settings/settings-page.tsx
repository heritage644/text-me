import type { ReactNode } from "react";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { Switch } from "../../components/ui/switch";
import type { NotificationSettings } from "../../types/types";
import { useLogout } from "../auth/hooks";
import { useCurrentUser } from "../auth/session-store";
import { useUpdateNotifications } from "./hooks";
import { PasswordSection } from "./password-section";
import { ProfileSection } from "./profile-section";

const NOTIFICATION_OPTIONS: Array<{ key: keyof NotificationSettings; label: string; description: string }> = [
  { key: "messages", label: "Direct messages", description: "Notify me about new 1:1 messages" },
  { key: "groups", label: "Groups", description: "Notify me about group messages" },
  { key: "previews", label: "Show previews", description: "Include message text in notifications" },
  { key: "sounds", label: "Sounds", description: "Play a sound for new messages" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-divider px-4 py-6">
      <h2 id={id} className="mb-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const me = useCurrentUser();
  const logout = useLogout();
  const notifications = useUpdateNotifications();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-4 pt-safe">
        <div className="flex h-14 items-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
        <div className="flex items-center gap-3 px-4 pb-6 pt-2">
          <Avatar name={me.name} src={me.avatarUrl} size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{me.name}</p>
            <p className="truncate text-sm text-fg-muted">
              @{me.username} · {me.email}
            </p>
          </div>
        </div>

        <Section id="settings-profile" title="Profile">
          <ProfileSection />
        </Section>

        <Section id="settings-notifications" title="Notifications">
          <div className="divide-y divide-divider">
            {NOTIFICATION_OPTIONS.map((o) => (
              <Switch
                key={o.key}
                label={o.label}
                description={o.description}
                checked={me.notifications[o.key]}
                onChange={(value) => notifications.mutate({ [o.key]: value })}
              />
            ))}
          </div>
        </Section>

        <Section id="settings-password" title="Change password">
          <PasswordSection />
        </Section>

        <div className="border-t border-divider px-4 py-6">
          <Button variant="secondary" block loading={logout.isPending} onClick={() => logout.mutate()} className="text-badge-alert">
            <Icon name="logout" className="h-5 w-5" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
