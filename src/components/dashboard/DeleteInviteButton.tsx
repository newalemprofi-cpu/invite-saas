"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

interface Props {
  inviteId: string;
  lang: Lang;
  className?: string;
}

const T = {
  kk: {
    label: "Жою",
    confirm: "Бұл шақыруды жойғыңыз келе ме?",
    deleting: "Жойылуда...",
    hasPayments: "Төлемі бар шақыруды жою мүмкін емес.",
    genericError: "Жою сәтсіз аяқталды. Қайталап көріңіз.",
  },
  ru: {
    label: "Удалить",
    confirm: "Удалить это приглашение?",
    deleting: "Удаление...",
    hasPayments: "Нельзя удалить приглашение с историей платежей.",
    genericError: "Не удалось удалить. Попробуйте снова.",
  },
} as const;

export function DeleteInviteButton({ inviteId, lang, className }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const t = T[lang];

  async function handleClick() {
    if (deleting) return;
    if (!window.confirm(t.confirm)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(data.error === "HAS_PAYMENTS" ? t.hasPayments : t.genericError);
        return;
      }
      router.refresh();
    } catch {
      window.alert(t.genericError);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={deleting}
      className={className}
      style={{
        background: "rgba(220,38,38,0.08)",
        color: "#dc2626",
        border: "1px solid rgba(220,38,38,0.2)",
        opacity: deleting ? 0.6 : 1,
      }}
    >
      {deleting ? t.deleting : t.label}
    </button>
  );
}
