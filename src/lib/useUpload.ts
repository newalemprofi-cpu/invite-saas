"use client";

import { useCallback, useState } from "react";

export interface UploadResult {
  id: string;
  url: string;
}

export type UploadTarget =
  | { mode: "invite"; inviteId: string }
  | { mode: "draft"; draftToken: string };

export type UploadErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVITE_NOT_FOUND"
  | "INVALID_KIND"
  | "MISSING_FILE"
  | "INVALID_FILE"
  | "INVALID_DRAFT_TOKEN"
  | "STORAGE_NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "RATE_LIMITER_UNAVAILABLE"
  | "UPLOAD_FAILED"
  | "NETWORK_ERROR"
  | "INVALID_FORM"
  | "MISSING_INVITE_ID";

export function useUpload(target: UploadTarget) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadErrorCode | null>(null);

  const targetKey = target.mode === "invite" ? `invite:${target.inviteId}` : `draft:${target.draftToken}`;

  const upload = useCallback(
    async (file: File, kind: "image" | "audio"): Promise<UploadResult | null> => {
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        let endpoint: string;
        if (target.mode === "invite") {
          form.append("inviteId", target.inviteId);
          endpoint = "/api/uploads";
        } else {
          form.append("draftToken", target.draftToken);
          endpoint = "/api/uploads/anonymous";
        }
        form.append("kind", kind);
        form.append("file", file);
        const res = await fetch(endpoint, { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: UploadErrorCode };
        if (!res.ok || !data.url) {
          setError(data.error ?? "UPLOAD_FAILED");
          return null;
        }
        return { id: data.id ?? "", url: data.url };
      } catch {
        setError("NETWORK_ERROR");
        return null;
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetKey]
  );

  return { upload, uploading, error, clearError: () => setError(null) };
}
