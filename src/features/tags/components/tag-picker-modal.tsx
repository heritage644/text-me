import { useState, type FormEvent } from "react";
import { errorMessage, isApiError } from "../../../api/errors";
import { Button } from "../../../components/ui/button";
import { ErrorState } from "../../../components/ui/empty-state";
import { Icon } from "../../../components/ui/icon";
import { Modal } from "../../../components/ui/modal";
import { Skeleton } from "../../../components/ui/skeleton";
import { focusRing } from "../../../components/ui/styles";
import { TextField } from "../../../components/ui/text-field";
import { cn } from "../../../lib/cn";
import type { Message, Tag, TagColor } from "../../../types/types";
import { useCreateTag, useDeleteTag, useSetMessageTags, useTags, useUpdateTag } from "../hooks";
import { tagColorClasses } from "../tag-colors";
import { ColorSwatches } from "./color-swatches";

const MAX_LABEL = 32;

/** One row of the "Manage tags" list: rename inline, recolour, delete. */
function ManageRow({ tag, onDeleted }: { tag: Tag; onDeleted: () => void }) {
  const update = useUpdateTag();
  const remove = useDeleteTag();
  const [label, setLabel] = useState(tag.label);
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const commit = () => {
    const next = label.trim();
    if (!next || next === tag.label) {
      setLabel(tag.label);
      return;
    }
    update.mutate(
      { tagId: tag.id, patch: { label: next } },
      {
        onError: (err) => {
          setLabel(tag.label);
          setError(isApiError(err) && err.fields.label ? err.fields.label : errorMessage(err));
        },
      },
    );
  };

  return (
    <li className="rounded-xl border border-divider px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          value={label}
          maxLength={MAX_LABEL}
          aria-label={`Rename tag ${tag.label}`}
          aria-invalid={!!error}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-divider bg-screen px-3 py-2 text-base outline-none transition-colors focus:border-accent",
            error && "border-badge-alert",
          )}
        />
        <button
          type="button"
          aria-label={`Delete tag ${tag.label}`}
          onClick={() => setConfirming(true)}
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-search-bar hover:text-badge-alert", focusRing)}
        >
          <Icon name="trash" className="h-5 w-5" />
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-badge-alert">{error}</p>}
      <ColorSwatches className="mt-2" value={tag.color} onChange={(color) => update.mutate({ tagId: tag.id, patch: { color } })} />
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-2">
          <span className="text-sm text-fg-muted">Remove it from every message?</span>
          <span className="flex gap-2">
            <Button variant="ghost" className="min-h-9 px-3 py-1 text-sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="min-h-9 px-3 py-1 text-sm"
              loading={remove.isPending}
              onClick={() => remove.mutate(tag.id, { onSuccess: onDeleted })}
            >
              Remove
            </Button>
          </span>
        </div>
      )}
    </li>
  );
}

type TagPickerModalProps = {
  open: boolean;
  /** The message being tagged, or `null` when closed. */
  message: Message | null;
  onClose: () => void;
};

/**
 * Add or remove the current user's tags on a message, create new tags, and
 * manage existing ones. Every change is saved as soon as it is made.
 *
 * The caller keys this component by message id, so opening a different message
 * always starts from an empty form.
 */
export function TagPickerModal({ open, message, onClose }: TagPickerModalProps) {
  const { data: tags, status, error, refetch } = useTags();
  const setTags = useSetMessageTags();
  const create = useCreateTag();
  const [managing, setManaging] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [formError, setFormError] = useState<string>();

  const all = tags ?? [];
  const selected = new Set((message?.tags ?? []).map((t) => t.id));

  const toggle = (tag: Tag) => {
    if (!message) return;
    const next = selected.has(tag.id) ? message.tags.filter((t) => t.id !== tag.id) : [...message.tags, tag];
    setTags.mutate({ message, tags: next });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = label.trim();
    if (!value || !message) return;
    setFormError(undefined);
    create.mutate(
      { label: value, color },
      {
        onSuccess: (tag) => {
          setLabel("");
          setTags.mutate({ message, tags: [...message.tags, tag] });
        },
        onError: (err) => setFormError(isApiError(err) && err.fields.label ? err.fields.label : errorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={managing ? "Manage tags" : "Tag message"}
      footer={
        all.length ? (
          <Button variant="secondary" block onClick={() => setManaging((m) => !m)}>
            {managing ? "Done" : "Manage tags"}
          </Button>
        ) : undefined
      }
    >
      {status === "pending" ? (
        <div className="space-y-3" aria-hidden="true">
          {["w-40", "w-32", "w-48"].map((w, i) => (
            <Skeleton key={i} className={cn("h-10", w)} />
          ))}
        </div>
      ) : status === "error" ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : managing ? (
        <ul className="space-y-3">
          {all.map((tag) => (
            <ManageRow key={tag.id} tag={tag} onDeleted={() => setManaging(false)} />
          ))}
        </ul>
      ) : (
        <>
          {all.length ? (
            <ul>
              {all.map((tag) => {
                const isSelected = selected.has(tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => toggle(tag)}
                      aria-pressed={isSelected}
                      className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-search-bar", focusRing)}
                    >
                      <span aria-hidden="true" className={cn("h-3 w-3 shrink-0 rounded-full", tagColorClasses(tag.color).fill)} />
                      <span className="min-w-0 flex-1 truncate">{tag.label}</span>
                      {isSelected && <Icon name="check" className="h-5 w-5 shrink-0 text-accent" aria-label="Applied" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-1 text-sm text-fg-muted">No tags yet. Create your first one below.</p>
          )}

          <form onSubmit={submit} className="mt-5 border-t border-divider pt-4">
            <TextField
              label="New tag"
              value={label}
              maxLength={MAX_LABEL}
              placeholder="e.g. Invoice"
              error={formError}
              onChange={(e) => setLabel(e.target.value)}
            />
            <ColorSwatches className="mt-3" value={color} onChange={setColor} />
            <Button type="submit" block className="mt-4" disabled={!label.trim()} loading={create.isPending}>
              Add tag
            </Button>
          </form>
        </>
      )}
    </Modal>
  );
}
