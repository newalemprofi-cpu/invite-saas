"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

interface Props {
  templateSlug: string;
  lang: Lang;
  eventCategory?: string;
}

const LABELS = {
  kk: { create: "Осы шаблонды таңдаймын", creating: "Ашылуда..." },
  ru: { create: "Выбрать этот шаблон", creating: "Открывается..." },
} as const;

export function TemplateCreateButton({ templateSlug, lang, eventCategory }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const L = LABELS[lang];

  function handleClick() {
    setLoading(true);
    // The constructor opens immediately for everyone, signed in or not —
    // no account is required to try it. Only publishing later requires auth.
    const eventCategoryParam = eventCategory ? `&eventCategory=${encodeURIComponent(eventCategory)}` : "";
    router.push(`/invitations/new?template=${encodeURIComponent(templateSlug)}&lang=${lang}${eventCategoryParam}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-gold w-full justify-center text-base"
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      {loading ? L.creating : L.create}
    </button>
  );
}
