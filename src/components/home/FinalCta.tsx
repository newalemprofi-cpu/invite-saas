import Link from "next/link";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  /** Admin's order WhatsApp number (getAdminConfig().orderWhatsapp) — this is an "I want to order" flow, never the receipt-submission number. */
  orderWhatsapp: string;
}

const T = {
  kk: {
    title: "Ерекше күніңізге\nшақыруды қазір жасаңыз",
    cta: "Шақыру жасау",
    orWhatsapp: "немесе WhatsApp арқылы тапсырыс беріңіз",
    waMessage: "Сәлем! Онлайн шақыру жасатқым келеді.",
  },
  ru: {
    title: "Создайте приглашение\nдля особенного дня",
    cta: "Создать приглашение",
    orWhatsapp: "или закажите через WhatsApp",
    waMessage: "Здравствуйте! Хочу заказать онлайн-приглашение.",
  },
} as const;

export function FinalCta({ lang, orderWhatsapp }: Props) {
  const t = T[lang];
  const phone = orderWhatsapp.replace(/\D/g, "");
  const waHref = `https://wa.me/${phone}?text=${encodeURIComponent(t.waMessage)}`;

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 text-center px-4" style={{ background: "var(--charcoal)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(196,150,62,0.15) 0%, transparent 70%)" }}
      />
      <div className="relative max-w-xl mx-auto flex flex-col items-center gap-6">
        <h2 className="heading-display text-3xl sm:text-4xl whitespace-pre-line" style={{ color: "var(--ivory)" }}>
          {t.title}
        </h2>
        <Link href={`/templates?lang=${lang}`} className="btn-gold text-base px-8 py-3.5">
          {t.cta} →
        </Link>
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "rgba(250,248,243,0.55)" }}>
          {t.orWhatsapp}
        </a>
      </div>
    </section>
  );
}
