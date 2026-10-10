import { useRef } from "react";
import { useUploadFile } from "../hooks/use-upload-file";
import { cn } from "../lib/cn";
import { Avatar } from "./ui/avatar";
import { Icon } from "./ui/icon";
import { Spinner } from "./ui/spinner";
import { focusRing } from "./ui/styles";
import { toast } from "./ui/toast-store";

type AvatarUploadProps = {
  name: string;
  url: string | null;
  onChange: (url: string) => void;
  label?: string;
  size?: number;
};

/** Tappable avatar that uploads a picked image and reports its URL. */
export function AvatarUpload({ name, url, onChange, label = "Change photo", size = 88 }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadFile();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={upload.isPending}
        aria-label={label}
        className={cn("relative rounded-full", focusRing, "focus-visible:ring-offset-2 focus-visible:ring-offset-screen")}
      >
        <Avatar name={name || "?"} src={url} size={size} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-screen/40 text-fg opacity-0 transition-opacity duration-150 hover:opacity-100">
          <Icon name="camera" className="h-6 w-6" />
        </span>
        {upload.isPending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-screen/60 text-fg">
            <Spinner className="h-6 w-6" label="Uploading photo" />
          </span>
        )}
      </button>
      <button type="button" onClick={() => input.current?.click()} className={cn("min-h-11 rounded-lg px-2 text-sm font-medium text-accent", focusRing)}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
          upload.mutate(file, { onSuccess: (attachment) => onChange(attachment.url) });
        }}
      />
    </div>
  );
}
