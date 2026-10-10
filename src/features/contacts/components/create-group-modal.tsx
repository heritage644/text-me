import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvatarUpload } from "../../../components/avatar-upload";
import { Button } from "../../../components/ui/button";
import { Modal } from "../../../components/ui/modal";
import { TextField } from "../../../components/ui/text-field";
import { formAlertClass } from "../../../components/ui/styles";
import { toFormErrors } from "../../../lib/form-errors";
import type { User } from "../../../types/types";
import { useCreateChat } from "../../chats/hooks";
import { MemberPicker } from "./member-picker";

type Errors = { name?: string; form?: string };

/** Two steps: pick members, then name the group (optional photo). */
export function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateChat();
  const [step, setStep] = useState<"members" | "details">("members");
  const [members, setMembers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const close = () => {
    onClose();
    setStep("members");
    setMembers([]);
    setName("");
    setAvatarUrl(null);
    setErrors({});
  };

  const submit = () => {
    if (!name.trim()) return setErrors({ name: "Give your group a name." });
    create.mutate(
      { type: "group", name: name.trim(), memberIds: members.map((m) => m.id), avatarUrl },
      {
        onSuccess: (chat) => {
          close();
          navigate(`/chats/${chat.id}`);
        },
        onError: (err) => setErrors(toFormErrors<keyof Errors>(err)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === "members" ? "Add members" : "New group"}
      footer={
        step === "members" ? (
          <Button block disabled={members.length === 0} onClick={() => setStep("details")}>
            {members.length ? `Next (${members.length} selected)` : "Select at least one person"}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" block onClick={() => setStep("members")}>
              Back
            </Button>
            <Button block loading={create.isPending} onClick={submit}>
              Create group
            </Button>
          </div>
        )
      }
    >
      {step === "members" ? (
        <MemberPicker selected={members} onChange={setMembers} />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5"
        >
          {errors.form && (
            <p role="alert" className={formAlertClass}>
              {errors.form}
            </p>
          )}
          <AvatarUpload name={name} url={avatarUrl} onChange={setAvatarUrl} label="Add group photo" />
          <TextField
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Football"
            maxLength={64}
            error={errors.name}
            autoFocus
          />
          <p className="text-sm text-fg-muted">
            {members.length} {members.length === 1 ? "member" : "members"}: {members.map((m) => m.name).join(", ")}
          </p>
        </form>
      )}
    </Modal>
  );
}
