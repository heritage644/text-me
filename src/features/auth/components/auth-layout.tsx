import type { ReactNode } from "react";
import { ChatIllustration, Logo } from "./auth-art";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** The Login page's two-column frame: illustration on large screens, compact brand on mobile. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh bg-screen text-fg lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-divider bg-screen p-12 lg:flex">
        <Logo />
        <div className="mx-auto w-full max-w-lg">
          <ChatIllustration className="block h-auto w-full" />
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">We encypt am end to end, no fear.</h2>
          <p className="mt-3 text-fg-muted">Message your friends for our app. .</p>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center bg-screen px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <ChatIllustration className="block h-auto w-48 sm:w-60" />
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-fg-muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
