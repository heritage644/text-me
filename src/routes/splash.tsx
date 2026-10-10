import { Spinner } from "../components/ui/spinner";
import { Logo } from "../features/auth/components/auth-art";

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-screen">
      <Logo />
      <Spinner className="h-6 w-6 text-fg-muted" label="Loading Text-ME" />
    </div>
  );
}
