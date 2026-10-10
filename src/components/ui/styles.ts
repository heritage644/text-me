/**
 * Shared class strings lifted from the Login page so every screen matches it.
 * Kept as full literals so Tailwind can see them.
 */
export const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-accent";

export const inputBase =
  "w-full rounded-xl bg-screen px-4 py-3 text-base text-fg placeholder:text-fg-muted " +
  "border outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

export const labelClass = "mb-2 block text-sm font-medium";
export const errorTextClass = "mt-1.5 text-sm text-badge-alert";
export const formAlertClass =
  "rounded-xl border border-badge-alert/50 bg-badge-alert/10 px-4 py-3 text-sm text-badge-alert";
