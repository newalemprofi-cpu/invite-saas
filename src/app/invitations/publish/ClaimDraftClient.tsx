"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAnonymousDraft, clearAnonymousDraft } from "@/lib/anonymousDraft";
import { editorDataToSaveBody } from "@/lib/invite-editor-data";
import type { Lang } from "@/lib/i18n";

const T = {
  kk: {
    working: "Шақыру дайындалуда...",
    error: "Қате орын алды. Қайталап көріңіз.",
    retry: "Қайталау",
    noDraft: "Сақталған жоба табылмады.",
    toTemplates: "Шаблондарға оралу",
  },
  ru: {
    working: "Готовим приглашение...",
    error: "Произошла ошибка. Попробуйте снова.",
    retry: "Повторить",
    noDraft: "Сохранённый черновик не найден.",
    toTemplates: "Вернуться к шаблонам",
  },
} as const;

type State = "working" | "error" | "no_draft";

export function ClaimDraftClient({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const t = T[lang];

  const attempt = useCallback(async () => {
    const draft = loadAnonymousDraft();
    if (!draft) {
      setState("no_draft");
      return;
    }
    setState("working");
    try {
      const res = await fetch("/api/invites/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftToken: draft.token,
          templateSlug: draft.templateSlug,
          data: editorDataToSaveBody(draft.data),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      if (!res.ok || !json.id) {
        setState("error");
        return;
      }
      clearAnonymousDraft();
      router.replace(`/dashboard/invites/${json.id}`);
    } catch {
      setState("error");
    }
  }, [router]);

  useEffect(() => {
    // Kick off the claim attempt once on mount — attempt() reads localStorage
    // (client-only) and reports progress via state, the standard pattern for
    // an on-mount async action.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    attempt();
  }, [attempt]);

  if (state === "no_draft") {
    return (
      <Centered>
        <p style={{ color: "var(--muted)" }}>{t.noDraft}</p>
        <a href={`/templates?lang=${lang}`} className="btn-gold mt-4 inline-block">
          {t.toTemplates}
        </a>
      </Centered>
    );
  }

  if (state === "error") {
    return (
      <Centered>
        <p style={{ color: "var(--muted)" }}>{t.error}</p>
        <button onClick={attempt} className="btn-gold mt-4">
          {t.retry}
        </button>
      </Centered>
    );
  }

  return (
    <Centered>
      <p className="animate-pulse" style={{ color: "var(--charcoal)" }}>{t.working}</p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4"
      style={{ background: "var(--ivory)" }}
    >
      {children}
    </div>
  );
}
