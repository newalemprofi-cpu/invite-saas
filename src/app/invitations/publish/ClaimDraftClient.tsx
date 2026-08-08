"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAnonymousDraft, clearAnonymousDraft } from "@/lib/anonymousDraft";
import { editorDataToSaveBody } from "@/lib/invite-editor-data";
import { buildLoginUrl } from "@/lib/auth-redirect";
import type { Lang } from "@/lib/i18n";

const T = {
  kk: {
    working: "Шақыру дайындалуда...",
    redirecting: "Жүйеге қайта кіру қажет...",
    error: "Қате орын алды. Қайталап көріңіз.",
    forbidden: "Бұл жобаны басқа тіркелгі әлдеқашан пайдаланды.",
    retry: "Қайталау",
    noDraft: "Сақталған жоба табылмады.",
    toTemplates: "Шаблондарға оралу",
  },
  ru: {
    working: "Готовим приглашение...",
    redirecting: "Нужно войти заново...",
    error: "Произошла ошибка. Попробуйте снова.",
    forbidden: "Этот черновик уже использован другим аккаунтом.",
    retry: "Повторить",
    noDraft: "Сохранённый черновик не найден.",
    toTemplates: "Вернуться к шаблонам",
  },
} as const;

type State = "working" | "error" | "forbidden" | "no_draft" | "redirecting";

const PUBLISH_PATH_PREFIX = "/invitations/publish?lang=";

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

    const claimOnce = () =>
      fetch("/api/invites/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftToken: draft.token,
          templateSlug: draft.templateSlug,
          data: editorDataToSaveBody(draft.data),
        }),
      });

    try {
      let res = await claimOnce();
      let json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };

      // A 401 landing here is surprising: this page only renders past its
      // own server-side session check, so we just proved a valid session
      // existed moments ago (most commonly right after register/login). A
      // single retry absorbs a cold-start/propagation blip between that
      // check and this client-side fetch without ever weakening the check
      // itself — a *second* 401 is treated as a real dead session below.
      if (res.status === 401 || json.error === "UNAUTHORIZED") {
        await new Promise((r) => setTimeout(r, 500));
        res = await claimOnce();
        json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      }

      if (res.ok && json.id) {
        clearAnonymousDraft();
        router.replace(`/dashboard/invites/${json.id}`);
        return;
      }

      // The session died between opening this page and the claim request
      // (e.g. it expired, or was logged out in another tab). This is an
      // auth-routing situation, not a generic failure — send them through
      // login proper, preserving the draft (still in localStorage) and
      // this exact page as the return target, rather than showing a dead
      // "retry" button that would just 401 again.
      if (res.status === 401 || json.error === "UNAUTHORIZED") {
        setState("redirecting");
        router.replace(buildLoginUrl({ from: `${PUBLISH_PATH_PREFIX}${lang}`, lang }));
        return;
      }

      if (json.error === "FORBIDDEN") {
        setState("forbidden");
        return;
      }

      setState("error");
    } catch {
      setState("error");
    }
  }, [router, lang]);

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

  if (state === "forbidden") {
    return (
      <Centered>
        <p style={{ color: "var(--muted)" }}>{t.forbidden}</p>
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

  if (state === "redirecting") {
    return (
      <Centered>
        <p className="animate-pulse" style={{ color: "var(--charcoal)" }}>{t.redirecting}</p>
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
