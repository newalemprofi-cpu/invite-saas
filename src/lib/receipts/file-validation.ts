/**
 * Server-side validation for uploaded payment receipts. Same "never trust
 * the declared content-type" principle as src/lib/media-validation.ts —
 * accepted type comes from a magic-byte signature check, not the filename
 * or browser-reported MIME.
 */
import { sniffImageMime } from "@/lib/media-validation";

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

const RECEIPT_IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d; // "%PDF-"
}

export interface ValidatedReceiptFile {
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  ext: string;
  kind: "image" | "pdf";
}

export function validateReceiptFile(size: number, bytes: Uint8Array): ValidatedReceiptFile | null {
  if (size <= 0 || size > RECEIPT_MAX_BYTES) return null;

  const imageMime = sniffImageMime(bytes);
  if (imageMime && imageMime in RECEIPT_IMAGE_EXT) {
    return { mime: imageMime as ValidatedReceiptFile["mime"], ext: RECEIPT_IMAGE_EXT[imageMime], kind: "image" };
  }
  if (isPdf(bytes)) {
    return { mime: "application/pdf", ext: "pdf", kind: "pdf" };
  }
  return null;
}
