import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { PasswordField } from "../../components/ui/text-field";
import { toast } from "../../components/ui/toast-store";
import { toFormErrors } from "../../lib/form-errors";
import { useChangePassword } from "./hooks";

type Errors = { currentPassword?: string; newPassword?: string; confirm?: string; form?: string };

export function PasswordSection() {
  const change = useChangePassword();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!currentPassword) next.currentPassword = "Enter your current password.";
    if (newPassword.length < 6) next.newPassword = "Password must be at least 6 characters.";
    if (confirm !== newPassword) next.confirm = "The two passwords no match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success("Password changed");
          setCurrent("");
          setNew("");
          setConfirm("");
        },
        onError: (err) => {
          const mapped = toFormErrors<keyof Errors>(err);
          setErrors(mapped);
          if (mapped.form) toast.error(mapped.form);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <PasswordField label="Current password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} error={errors.currentPassword} />
      <PasswordField label="New password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} error={errors.newPassword} />
      <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" variant="secondary" block loading={change.isPending}>
        Change password
      </Button>
    </form>
  );
}
