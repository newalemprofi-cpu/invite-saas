"use client";

import { useCallback, useState } from "react";

export interface UploadResult {
  id: string;
  url: string;
}

export type UploadErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVITE_NOT_FOUND"
  | "INVALID_KIND"
  | "MISSING_FILE"
  | "INVALID_FILE"
  | "STORAGE_NOT_CONFIGURED"
  | "UPLOAD_FAILED"
  | "NETWORK_ERROR"
  | "INVALID_FORM"
  | "MISSING_INVITE_ID";

export function useUpload(inviteId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadErrorCode | null>(null);

  const upload = useCallback(
    async (file: File, kind: "image" | "audio"): Promise<UploadResult | null> => {
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("inviteId", inviteId);
        form.append("kind", kind);
        form.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: UploadErrorCode };
        if (!res.ok || !data.url || !data.id) {
          setError(data.error ?? "UPLOAD_FAILED");
          return null;
        }
        return { id: data.id, url: data.url };
      } catch {
        setError("NETWORK_ERROR");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [inviteId]
  );

  return { upload, uploading, error, clearError: () => setError(null) };
}
