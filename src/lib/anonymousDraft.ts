"use client";

import type { EditorData } from "@/lib/invite-editor-data";
import type { Lang } from "@/lib/i18n";

/**
 * Anonymous, pre-account invitation draft. Lives entirely in the browser
 * (localStorage) until the customer clicks publish and authenticates —
 * only then does a real Invite row get created (see /api/invites/claim).
 * Versioned key so a future incompatible shape can be migrated/discarded
 * safely instead of crashing old drafts.
 */
const DRAFT_KEY = "inviteSaaS.anonymousDraft.v1";

export interface AnonymousDraft {
  token: string;
  templateSlug: string;
  lang: Lang;
  data: EditorData;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadAnonymousDraft(): AnonymousDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnonymousDraft>;
    if (!parsed || typeof parsed.token !== "string" || typeof parsed.templateSlug !== "string" || !parsed.data) {
      return null;
    }
    return parsed as AnonymousDraft;
  } catch {
    return null;
  }
}

export function saveAnonymousDraft(draft: AnonymousDraft): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable/full (e.g. private browsing) — the draft simply
    // won't survive a reload; the constructor itself keeps working.
  }
}

export function clearAnonymousDraft(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Cryptographically random, unguessable — scopes anonymous uploads and claim idempotency. */
export function createDraftToken(): string {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (isBrowser() && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
