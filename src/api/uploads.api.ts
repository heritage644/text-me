import type { Attachment } from "../types/types";
import { http } from "./client";
import { endpoints } from "./endpoints";
import { toAttachment, unwrap } from "./normalize";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Reads image dimensions so bubbles can reserve space before the image loads. */
async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/**
 * POST /uploads (multipart: `file`, optional `width`/`height`) → Attachment
 * `{ id, url, mime, size, name, width, height }`. Errors: 413 FILE_TOO_LARGE, 415 UNSUPPORTED_TYPE.
 */
export async function uploadFile(file: File, signal?: AbortSignal): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const size = await imageSize(file);
  if (size) {
    form.append("width", String(size.width));
    form.append("height", String(size.height));
  }
  return toAttachment(unwrap(await http.post(endpoints.uploads, form, { signal, timeoutMs: 120_000 })));
}
