import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { formAlertClass } from "../../components/ui/styles";
import { PasswordField } from "../../components/ui/text-field";
import { toFormErrors } from "../../lib/form-errors";
import { AuthLayout } from "./components/auth-layout";
import { useResetPassword } from "./hooks";

type Errors = { password?: string; confirm?: string; form?: string };

/** Reached from the emailed link: `/reset-password?token=…`. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const reset = useResetPassword();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    if (confirm !== password) next.confirm = "The two passwords no match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    reset.mutate({ token, password }, { onError: (err) => setErrors(toFormErrors<keyof Errors>(err)) });
  };

  if (!token) {
    return (
      <AuthLayout title="This link no complete" subtitle="The reset link is missing its token. Request a new one.">
        <p className="mt-8 text-center">
          <Link to="/forgot-password" className="font-medium text-accent hover:underline">
            Request a new link
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Password don change" subtitle="You fit sign in with your new password now.">
        <div className="mt-8" role="status">
          <Link
            to="/login"
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-accent py-3 text-base font-semibold text-fg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-screen"
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose something strong wey you go remember this time.">
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {errors.form && (
          <p role="alert" className={formAlertClass}>
            {errors.form}{" "}
            <Link to="/forgot-password" className="font-medium underline">
              Get a new link
            </Link>
          </p>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Same password, abeg"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" block loading={reset.isPending}>
          {reset.isPending ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
