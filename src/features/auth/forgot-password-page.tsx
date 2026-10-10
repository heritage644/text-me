import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { formAlertClass } from "../../components/ui/styles";
import { TextField } from "../../components/ui/text-field";
import { toFormErrors } from "../../lib/form-errors";
import { AuthLayout } from "./components/auth-layout";
import { useForgotPassword } from "./hooks";

type Errors = { email?: string; form?: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const forgot = useForgotPassword();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErrors({ email: "Enter a valid email address." });
    setErrors({});
    forgot.mutate({ email: email.trim() }, { onError: (err) => setErrors(toFormErrors<keyof Errors>(err)) });
  };

  if (forgot.isSuccess) {
    return (
      <AuthLayout title="Check your email" subtitle={`If ${email} get account with us, we don send reset link go there.`}>
        <div className="mt-8 space-y-4" role="status">
          <p className="text-sm text-fg-muted">The link expires in 1 hour. Check your spam folder if you no see am.</p>
          <Button variant="secondary" block onClick={() => forgot.reset()}>
            Use another email
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="You forget am? No wahala." subtitle="Enter your email and we go send you link to reset your password.">
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {errors.form && (
          <p role="alert" className={formAlertClass}>
            {errors.form}
          </p>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Button type="submit" block loading={forgot.isPending}>
          {forgot.isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-fg-muted">
        You don remember?{" "}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
