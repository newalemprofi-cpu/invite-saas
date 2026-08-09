/**
 * Server-side file validation for customer uploads. We never trust a
 * filename extension — the accepted MIME comes from a signature (magic
 * bytes) check for images, and from the browser-reported content type
 * (still allowlisted) for audio, since audio container signatures vary
 * too much to sniff cheaply and reliably.
 */

export type UploadKind = "image" | "audio";

interface Rule {
  maxBytes: number;
  mimes: Record<string, string>; // mime -> file extension
}

export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  image: {
    maxBytes: 8 * 1024 * 1024,
    mimes: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    },
  },
  audio: {
    maxBytes: 20 * 1024 * 1024,
    mimes: {
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/x-m4a": "m4a",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/aac": "aac",
    },
  },
};

export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

export interface ValidatedFile {
  mime: string;
  ext: string;
}

/** Returns the validated mime/extension, or null if the file is rejected. */
export function validateUpload(kind: UploadKind, declaredType: string, size: number, bytes: Uint8Array): ValidatedFile | null {
  const rule = UPLOAD_RULES[kind];
  if (size <= 0 || size > rule.maxBytes) return null;

  if (kind === "image") {
    const sniffed = sniffImageMime(bytes);
    if (!sniffed || !(sniffed in rule.mimes)) return null;
    return { mime: sniffed, ext: rule.mimes[sniffed] };
  }

  // Audio: trust the browser-reported type, but only from the allowlist.
  const ext = rule.mimes[declaredType];
  if (!ext) return null;
  return { mime: declaredType, ext };
}
