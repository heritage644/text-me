import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { Button } from "./button";

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = "chats", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-divider text-fg-muted">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="max-w-xs text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon="alert"
        title="Something went wrong"
        description={message}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry} className="mt-1">
              Try again
            </Button>
          )
        }
      />
    </div>
  );
}
