import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "../../../components/ui/icon";
import { IconButton } from "../../../components/ui/icon-button";
import { focusRing } from "../../../components/ui/styles";
import { cn } from "../../../lib/cn";
import { useSendMessage, useTypingEmitter } from "../hooks";
import { useUploads } from "../use-uploads";
import { AttachmentTray } from "./attachment-tray";

const MAX_TEXTAREA_PX = 160;

export function Composer({ chatId }: { chatId: string }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const send = useSendMessage(chatId);
  const typing = useTypingEmitter(chatId);
  const uploads = useUploads();

  const canSend = (text.trim().length > 0 || uploads.attachments.length > 0) && !uploads.isUploading && !uploads.hasErrors;

  // Auto-grow up to MAX_TEXTAREA_PX, then scroll inside.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [text]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    send({ body: text.trim(), attachments: uploads.attachments });
    setText("");
    uploads.clear();
    typing.stop();
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline; ignore Enter while an IME is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-divider bg-screen px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4"
    >
      {uploads.uploads.length > 0 && <AttachmentTray uploads={uploads.uploads} onRemove={uploads.remove} onRetry={uploads.retry} />}
      <div className="flex items-end gap-1.5">
        <IconButton icon="clip" label="Attach files" onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            uploads.add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <label htmlFor={`composer-${chatId}`} className="sr-only">
          Message
        </label>
        <textarea
          id={`composer-${chatId}`}
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            typing.onInput();
          }}
          onKeyDown={onKeyDown}
          onBlur={typing.stop}
          placeholder="Message"
          enterKeyHint="send"
          autoComplete="off"
          className="min-h-11 flex-1 resize-none rounded-[22px] border border-divider bg-screen px-4 py-2.5 text-base leading-6 text-fg outline-none transition-colors duration-150 placeholder:text-fg-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-fg transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
            focusRing,
            "focus-visible:ring-offset-2 focus-visible:ring-offset-screen",
          )}
        >
          <Icon name="send" className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
