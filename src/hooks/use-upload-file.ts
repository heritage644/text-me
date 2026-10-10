import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "../api/uploads.api";

/** Single-file upload (avatars). Message attachments use `useUploads` for multi-file progress. */
export function useUploadFile() {
  return useMutation({ mutationFn: (file: File) => uploadFile(file) });
}
