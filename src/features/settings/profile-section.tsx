import { useState, type FormEvent } from "react";
import { AvatarUpload } from "../../components/avatar-upload";
import { Button } from "../../components/ui/button";
import { TextField } from "../../components/ui/text-field";
import { toast } from "../../components/ui/toast-store";
import { toFormErrors } from "../../lib/form-errors";
import { useCurrentUser } from "../auth/session-store";
import { useUpdateProfile } from "./hooks";

type Errors = { name?: string; username?: string; status?: string; form?: string };

export function ProfileSection() {
  const me = useCurrentUser();
  const update = useUpdateProfile();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [status, setStatus] = useState(me.status);
  const [errors, setErrors] = useState<Errors>({});

  const dirty = name !== me.name || username !== me.username || status !== me.status;

  const save = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Enter your name.";
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) next.username = "3–20 letters, numbers or underscores.";
    setErrors(next);
    if (Object.keys(next).length) return;
    update.mutate(
      { name: name.trim(), username, status: status.trim() },
      {
        onSuccess: () => toast.success("Profile saved"),
        onError: (err) => {
          const mapped = toFormErrors<keyof Errors>(err);
          setErrors(mapped);
          if (mapped.form) toast.error(mapped.form);
        },
      },
    );
  };

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <AvatarUpload
        name={me.name}
        url={me.avatarUrl}
        onChange={(avatarUrl) => update.mutate({ avatarUrl }, { onError: (err) => toast.error(toFormErrors(err).form ?? "Couldn't update photo.") })}
      />
      <TextField label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={64} />
      <TextField
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
        hint="People can find you by this."
      />
      <TextField
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        error={errors.status}
        placeholder="What's on your mind?"
        maxLength={140}
      />
      <Button type="submit" block disabled={!dirty} loading={update.isPending && dirty}>
        Save profile
      </Button>
    </form>
  );
}
