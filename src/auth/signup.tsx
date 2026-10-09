import { useState, type ReactNode, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
type SignUpErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
  form?: string;
};

type SignUpProps = {
  onSubmit?: (data: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void> | void;
  onSwitchToLogin?: () => void;
};

/* ---------- Tooltip ---------- */
function Tip({
  text,
  children,
  align = "center",
}: {
  text: string;
  children: ReactNode;
  align?: "center" | "right" | "left";
}) {
  const pos =
    align === "right"
      ? "right-0"
      : align === "left"
      ? "left-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative group inline-block">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full mb-2 ${pos} z-20 w-max max-w-[16rem] rounded-md bg-white px-3 py-1.5 text-xs text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {text}
      </span>
    </span>
  );
}

/* ---------- Page ---------- */
export default function SignUp({ onSubmit, onSwitchToLogin }: SignUpProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [loading, setLoading] = useState(false);
const navigate = useNavigate();
  const validate = () => {
 
    const next: SignUpErrors = {};
    if (username.trim().length < 3)
      next.username = "Name must reach at least 3 letters.";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address.";
    if (password.length < 6)
      next.password = "Password must be at least 6 characters.";
    if (confirm !== password) next.confirm = "The two passwords no match.";
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
       
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
  setLoading(true);
  const res = await fetch(
    "https://supreme-xylophone-7q469j44j94hwq5x-3000.app.github.dev/api/auth/register",
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Zod validation errors: { message, errors: [{ field, message }] }
    if (Array.isArray(data.errors)) {
      const fieldErrors: SignUpErrors = {};
      for (const e of data.errors) {
        if (e.field === "username") fieldErrors.username = e.message;
        else if (e.field === "email") fieldErrors.email = e.message;
        else if (e.field === "password") fieldErrors.password = e.message;
      }
      setErrors({
        ...fieldErrors,
        form: Object.keys(fieldErrors).length ? undefined : data.message,
      });
    } else {
      setErrors({ form: data.message || "Registration failed. Please try again." });
    }
    return;
  }

  navigate("/login"); // success
} catch (err) {
  setErrors({
    form: err instanceof Error ? err.message : "Something shake o. Try again.",
  });
} finally {
  setLoading(false);
}
  };

  const inputBase =
    "w-full rounded-xl bg-screen px-4 py-3 text-base text-fg placeholder:text-fg-muted " +
    "border outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent";

  const fieldBorder = (err?: string) =>
    err ? "border-red-500" : "border-white/15";

  const label = "text-sm font-semibold text-fg";
  const errorText = "mt-1.5 text-sm text-red-500";

  return (
    <main className="grid min-h-screen bg-screen text-fg lg:grid-cols-2">
      {/* Left panel */}
      <section className="hidden flex-col justify-between border-r border-white/10 p-16 lg:flex">
        <Tip text="Na chat app, no be bank. Relax." align="left">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold">Text-ME</span>
          </div>
        </Tip>

        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Join the gist, <br /> make we yarn.
          </h2>
          <p className="mt-3 max-w-md text-fg-muted">
            Open account in 1 minute. Your people dey wait for you inside.
          </p>
        </div>
      </section>

      {/* Right panel */}
      <section className="flex items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full max-w-md space-y-5"
        >
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Oya join us!</h1>
            <p className="mt-2 text-fg-muted">
              Put your details make we create your account.
            </p>
          </header>

          {errors.form && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {errors.form}
            </p>
          )}

          {/* Username */}
          <div>
            <Tip text="Pick name wey fine. 'admin123' no go work abeg." align="left">
              <label htmlFor="username" className={label}>
                Wetin we go call you?
              </label>
            </Tip>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. omo_lagos"
              aria-invalid={!!errors.username}
              className={`${inputBase} mt-2 ${fieldBorder(errors.username)}`}
            />
            {errors.username && <p className={errorText}>{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <Tip text="No use your ex email o, e go dey send you old gist." align="left">
              <label htmlFor="email" className={label}>
                Email
              </label>
            </Tip>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              className={`${inputBase} mt-2 ${fieldBorder(errors.email)}`}
            />
            {errors.email && <p className={errorText}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <Tip text="'password123'? Even your neighbour fit guess am." align="left">
              <label htmlFor="password" className={label}>
                Password
              </label>
            </Tip>
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Make am strong small"
                aria-invalid={!!errors.password}
                className={`${inputBase} pr-16 ${fieldBorder(errors.password)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-fg-muted hover:text-fg"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className={errorText}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <Tip text="Type am again. Na here many people dey mess up." align="left">
              <label htmlFor="confirm" className={label}>
                Type am again
              </label>
            </Tip>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same password, abeg"
              aria-invalid={!!errors.confirm}
              className={`${inputBase} mt-2 ${fieldBorder(errors.confirm)}`}
            />
            {errors.confirm && <p className={errorText}>{errors.confirm}</p>}
          </div>

          {/* Terms */}
          <div>
            <Tip text="Nobody dey read am, but just tick am make we move." align="left">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-fg-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-accent,#3b82f6)]"
                />
                <span>
                  I don read the{" "}
                  <a href="#" className="text-accent hover:underline">
                    terms and conditions
                  </a>
                  , I agree.
                </span>
              </label>
            </Tip>
            {errors.terms && <p className={errorText}>{errors.terms}</p>}
          </div>

          {/* Submit */}
          <Tip text="Click am, no fear. We no dey bite." align="center">
            <button
              type="submit"
              disabled={loading}
              className="w-[28rem] max-w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {loading ? "Dey create your account..." : "Sign me up"}
            </button>
          </Tip>

          <p className="pt-2 text-center text-sm text-fg-muted">
            You don dey here before?{" "}
            <Tip text="Ehen! Oga/Madam don return. Go log in." align="right">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin?.();
                }}
                className="font-medium text-accent hover:underline"
              >
                Abeg sign in na.
              </a>
            </Tip>
          </p>
        </form>
      </section>
    </main>
  );
}