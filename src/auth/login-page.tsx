
import { useState } from "react";
 import {Link} from "react-router-dom";

 import {useNavigate} from "react-router-dom";
function ChatIllustration({ className = "" }) {

   
  return (
    <svg
      viewBox="0 0 480 440"
      width="480"
      height="440"
      className={className}
      role="img"
      aria-label="Chat bubbles illustrating a messaging app"
    >
      <style>{`
        @keyframes textme-dot { 0%,80%,100% { opacity:.3 } 40% { opacity:1 } }
        .textme-dot { animation: textme-dot 1.2s infinite ease-in-out; }
        .textme-dot:nth-of-type(2) { animation-delay: .15s; }
        .textme-dot:nth-of-type(3) { animation-delay: .3s; }
        @media (prefers-reduced-motion: reduce) { .textme-dot { animation:none; opacity:.7 } }
      `}</style>
 
      {/* Backdrop circle */}
      <circle cx="240" cy="220" r="190" className="fill-search-bar stroke-divider" strokeWidth="1.5" />
 
      {/* Incoming bubble 1 */}
      <rect x="70" y="95" width="210" height="62" rx="26" className="fill-pill" />
      <path d="M92 150 L78 172 L116 154 Z" className="fill-pill" />
      <rect x="94" y="115" width="140" height="9" rx="4.5" className="fill-fg-muted" />
      <rect x="94" y="133" width="96" height="9" rx="4.5" className="fill-fg-muted" opacity=".6" />
 
      {/* Outgoing bubble */}
      <rect x="170" y="190" width="240" height="70" rx="28" className="fill-accent" />
      <path d="M388 252 L406 278 L360 258 Z" className="fill-accent" />
      <rect x="196" y="211" width="168" height="9" rx="4.5" className="fill-fg" />
      <rect x="196" y="231" width="110" height="9" rx="4.5" className="fill-fg" opacity=".7" />
 
      {/* Incoming bubble 2 */}
      <rect x="70" y="290" width="150" height="54" rx="24" className="fill-pill" />
      <path d="M92 338 L78 360 L112 342 Z" className="fill-pill" />
      <rect x="94" y="311" width="100" height="9" rx="4.5" className="fill-fg-muted" />
 
      {/* Typing indicator */}
      <rect x="244" y="318" width="86" height="44" rx="22" className="fill-pill" />
      <circle className="textme-dot fill-fg-faint" cx="272" cy="340" r="5" />
      <circle className="textme-dot fill-fg-faint" cx="287" cy="340" r="5" />
      <circle className="textme-dot fill-fg-faint" cx="302" cy="340" r="5" />
 
      {/* Online dot + unread badge */}
      <circle cx="376" cy="108" r="9" className="fill-status-active" />
      <circle cx="420" cy="170" r="14" className="fill-badge-alert" />
      <text x="420" y="175" textAnchor="middle" fontSize="14" fontWeight="600" className="fill-fg">
        3
      </text>
    </svg>
  );
}
 
function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h-.5A2.5 2.5 0 0 1 4 13.5v-7Z"
            className="fill-fg"
          />
        </svg>
      </span>
      <span className="text-xl font-semibold tracking-tight text-fg">Text-ME</span>
    </div>
  );
}
 
export default function Login() {
const navigate = useNavigate();
 type FormErrors = {
  email?: string;
  password?: string;
  form?: string;
  message?: string;
};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});;
  const [loading, setLoading] = useState(false);
   
  const validate = () => {
    const next :  FormErrors = { };
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email  = "Enter a valid email address.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    return next;
  };
 
  const handleSubmit = async (e :any) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
  
    try {
      setLoading(true);
        const res = await fetch("https://supreme-xylophone-7q469j44j94hwq5x-3000.app.github.dev/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
          const data = await res.json()
        console.log(data)
        if (!data.success) {
          setErrors({ form: data.message || "Login failed. Please try again." });
        }
        if (res.ok) {
        navigate("/chat");
        }

    } catch (err :any) {
      setErrors({ form: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };
 
  const inputBase =
    "w-full rounded-xl bg-screen px-4 py-3 text-base text-fg placeholder:text-fg-muted " +
    "border outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";
 
  return (
    <main className="min-h-dvh bg-screen text-fg lg:grid lg:grid-cols-2">
      {/* Left: illustration (large screens) */}
      <section className="hidden flex-col justify-between border-r border-divider bg-screen p-12 lg:flex">
        <Logo />
        <div className="mx-auto w-full max-w-lg">
          <ChatIllustration className="block h-auto w-full" />
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          We encypt am end to end, no fear.
          </h2>
          <p className="mt-3 text-fg-muted">
            Message your friends for our app. .
          </p>
        </div>
      </section>
 
      {/* Right: form */}
      <section className="flex min-h-dvh items-center justify-center bg-screen px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Compact brand for small screens */}
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <ChatIllustration className="block h-auto w-48 sm:w-60" />
            <Logo />
          </div>
 
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">We sabi you??</h1>
          <p className="mt-2 text-fg-muted"> Enter your details make we know if we sabi you.</p>
 
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
  <a href="#" className="text-sm text-accent hover:underline">
    You Forget password?
  </a>
  <span
    className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
  >
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
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3 text-base font-semibold text-fg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-screen disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
 
          <p className="mt-8 text-center text-sm text-fg-muted">
             Oboy your identity no clear {" "}
            <Link to="/signup" className="font-medium text-accent hover:underline">
             We no sabi you, sign up.
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
 
