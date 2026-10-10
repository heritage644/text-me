import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { env } from "../../lib/env";
import { toFormErrors } from "../../lib/form-errors";
import { AuthLayout } from "./components/auth-layout";
import { useLogin } from "./hooks";

type FormErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const login = useLogin();

  const validate = () => {
    const next: FormErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    return next;
  };

  // On success the session updates and PublicOnlyRoute redirects to the page the user came from.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    login.mutate({ email: email.trim(), password }, { onError: (err) => setErrors(toFormErrors<keyof FormErrors>(err)) });
  };

  const inputBase =
    "w-full rounded-xl bg-screen px-4 py-3 text-base text-fg placeholder:text-fg-muted " +
    "border outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <AuthLayout title="We sabi you??" subtitle=" Enter your details make we know if we sabi you.">
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {errors.form && (
          <p
            role="alert"
            className="rounded-xl border border-badge-alert/50 bg-badge-alert/10 px-4 py-3 text-sm text-badge-alert"
          >
            {errors.form}
          </p>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`${inputBase} ${errors.email ? "border-badge-alert" : "border-divider"}`}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-sm text-badge-alert">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <span className="relative group inline-block">
              <Link to="/forgot-password" className="text-sm text-accent hover:underline">
                You Forget password?
              </Link>
              <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-screen px-3 py-1.5 text-xs text-fg opacity-0 transition-opacity group-hover:opacity-100">
                Why you go forget password?
              </span>
            </span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`${inputBase} pr-16 ${errors.password ? "border-badge-alert" : "border-divider"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 rounded-r-xl px-4 text-sm text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-sm text-badge-alert">
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-xl bg-accent py-3 text-base font-semibold text-fg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-screen disabled:cursor-not-allowed disabled:opacity-60"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-fg-muted">
        Oboy your identity no clear{" "}
        <Link to="/signup" className="font-medium text-accent hover:underline">
          We no sabi you, sign up.
        </Link>
      </p>

      {env.useMocks && (
        <p className="mt-6 rounded-xl border border-divider px-4 py-3 text-center text-xs text-fg-muted">
          Mock mode: any email and a 6+ character password signs you in. Use <code>wrong-password</code> to see an error.
        </p>
      )}
    </AuthLayout>
  );
}
