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
    title: "Шақыруды жою",
    body: "Бұл шақыруды жойғыңыз келе ме? Бұл әрекетті кері қайтару мүмкін емес.",
    cancel: "Болдырмау",
    confirm: "Жою",
    deleting: "Жойылуда...",
    hasPayments: "Төлемі бар шақыруды жою мүмкін емес.",
    genericError: "Жою сәтсіз аяқталды. Қайталап көріңіз.",
  },
  ru: {
    label: "Удалить",
    title: "Удалить приглашение",
    body: "Вы действительно хотите удалить это приглашение? Это действие нельзя отменить.",
    cancel: "Отмена",
    confirm: "Удалить",
    deleting: "Удаление...",
    hasPayments: "Нельзя удалить приглашение с историей платежей.",
    genericError: "Не удалось удалить. Попробуйте снова.",
  },
} as const;

export function DeleteInviteButton({ inviteId, lang, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = T[lang];

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error === "HAS_PAYMENTS" ? t.hasPayments : t.genericError);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t.genericError);
    } finally {
      setDeleting(false);
    }
  }

  function closeIfIdle() {
    if (deleting) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={{
          background: "rgba(220,38,38,0.08)",
          color: "#dc2626",
          border: "1px solid rgba(220,38,38,0.2)",
        }}
      >
        {t.label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-invite-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,25,23,0.45)" }}
          onClick={closeIfIdle}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "white", boxShadow: "0 24px 64px rgba(28,25,23,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-invite-title" className="text-lg font-bold" style={{ color: "var(--charcoal, #1C1917)" }}>
              {t.title}
            </h2>
            <p className="text-sm" style={{ color: "var(--muted, #78716C)" }}>
              {t.body}
            </p>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={closeIfIdle}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--cream, #F5F0E8)",
                  color: "var(--charcoal, #1C1917)",
                  border: "1px solid var(--border, #E8E2D9)",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "#dc2626", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? t.deleting : t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
