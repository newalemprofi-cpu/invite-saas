"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import type { Lang } from "@/lib/i18n";

interface Props {
  templateSlug: string;
  session: SessionPayload | null;
  lang: Lang;
}

const LABELS = {
  kk: { create: "✨ Осы шаблонмен жасау", registerAndCreate: "Тіркеліп жасау", creating: "Ашылуда..." },
  ru: { create: "✨ Создать по этому шаблону", registerAndCreate: "Зарегистрироваться и создать", creating: "Открывается..." },
} as const;

export function TemplateCreateButton({ templateSlug, session, lang }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const L = LABELS[lang];

  function handleClick() {
    setLoading(true);
    // /invitations/new resolves auth itself: authenticated users go straight
    // into the constructor with this template applied; anonymous users are
    // bounced through register/login and land back here automatically.
    router.push(`/invitations/new?template=${encodeURIComponent(templateSlug)}&lang=${lang}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-gold w-full justify-center text-base"
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      {loading ? L.creating : session ? L.create : L.registerAndCreate}
    </button>
  );
}
