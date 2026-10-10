import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isApiError } from "../../api/errors";
import { MAX_UPLOAD_BYTES, uploadFile } from "../../api/uploads.api";
import { toast } from "../../components/ui/toast-store";
import { createTempId } from "../../lib/ids";
import type { Attachment } from "../../types/types";

export type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "uploading" | "done" | "error";
  attachment?: Attachment;
  error?: string;
};

/** Uploads files as soon as they're picked, so sending is instant afterwards. */
export function useUploads() {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const previews = useRef(new Set<string>());

  const patch = (id: string, next: Partial<PendingUpload>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...next } : u)));

  const start = useCallback((id: string, file: File) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    uploadFile(file, controller.signal)
      .then((attachment) => patch(id, { status: "done", attachment }))
      .catch((err) => {
        if (isApiError(err) && err.kind === "aborted") return;
        patch(id, { status: "error", error: errorMessage(err) });
      })
      .finally(() => controllers.current.delete(id));
  }, []);

  const add = useCallback(
    (files: File[]) => {
      const accepted = files.filter((file) => {
        if (file.size <= MAX_UPLOAD_BYTES) return true;
        toast.error(`${file.name} is larger than 25 MB.`);
        return false;
      });
      const entries = accepted.map((file) => {
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        if (previewUrl) previews.current.add(previewUrl);
        return { id: createTempId("upload"), file, previewUrl, status: "uploading" as const };
      });
      setUploads((list) => [...list, ...entries]);
      entries.forEach((e) => start(e.id, e.file));
    },
    [start],
  );

  const release = (upload: PendingUpload) => {
    controllers.current.get(upload.id)?.abort();
    if (upload.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
      previews.current.delete(upload.previewUrl);
    }
  };

  const remove = useCallback((id: string) => {
    setUploads((list) => {
      const target = list.find((u) => u.id === id);
      if (target) release(target);
      return list.filter((u) => u.id !== id);
    });
  }, []);

  const retry = useCallback(
    (id: string) => {
      setUploads((list) => list.map((u) => (u.id === id ? { ...u, status: "uploading", error: undefined } : u)));
      const target = uploads.find((u) => u.id === id);
      if (target) start(id, target.file);
    },
    [uploads, start],
  );

  const clear = useCallback(() => {
    setUploads((list) => {
      list.forEach(release);
      return [];
    });
  }, []);

  // Abort in-flight uploads and free previews when the composer unmounts.
  useEffect(() => {
    const ctrls = controllers.current;
    const urls = previews.current;
    return () => {
      ctrls.forEach((c) => c.abort());
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return {
    uploads,
    add,
    remove,
    retry,
    clear,
    attachments: uploads.flatMap((u) => (u.attachment ? [u.attachment] : [])),
    isUploading: uploads.some((u) => u.status === "uploading"),
    hasErrors: uploads.some((u) => u.status === "error"),
  };
}
