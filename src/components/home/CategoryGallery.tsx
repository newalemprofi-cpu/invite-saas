import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { eventCategoryLabel, type EventCategory } from "@/lib/event-categories";

export interface CategoryCardData {
  category: EventCategory;
  coverUrl: string | null;
  count: number;
}

interface Props {
  lang: Lang;
  cards: CategoryCardData[];
}

const T = {
  kk: {
    title: "Мерекеңізді таңдаңыз",
    subtitle: "Әр мерекеге арналған дайын шақыру үлгілері",
    countSuffix: "шаблон",
  },
  ru: {
    title: "Выберите событие",
    subtitle: "Готовые приглашения для вашего праздника",
    countSuffix: "шаблонов",
  },
} as const;

// A small, fixed rotation of warm gradients for categories with no admin-
// uploaded cover yet — keeps the grid visually varied instead of every
// fallback card looking identical, without needing any photography.
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #E8C97A 0%, #C4963E 100%)",
  "linear-gradient(135deg, #2D2520 0%, #1C1917 100%)",
  "linear-gradient(135deg, #F5F0E8 0%, #E8C97A 100%)",
  "linear-gradient(135deg, #9A7B2F 0%, #2D2520 100%)",
];

export function CategoryGallery({ lang, cards }: Props) {
  const t = T[lang];
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="text-center mb-10">
        <h2 className="heading-display text-3xl sm:text-4xl" style={{ color: "var(--charcoal)" }}>
          {t.title}
        </h2>
        <p className="mt-3 text-base" style={{ color: "var(--muted)" }}>{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ category, coverUrl, count }, i) => {
          const label = eventCategoryLabel(category, lang);
          return (
            <Link
              key={category.id}
              href={`/templates?cat=${category.cat}&eventCategory=${category.id}&lang=${lang}`}
              className="group relative block rounded-2xl overflow-hidden aspect-[3/4] transition-transform duration-300 hover:-translate-y-1"
              style={{ boxShadow: "0 2px 16px rgba(28,25,23,0.08)" }}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={label}
                  loading={i < 4 ? "eager" : "lazy"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-5xl transition-transform duration-500 group-hover:scale-105"
                  style={{ background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] }}
                >
                  <span style={{ opacity: 0.9 }}>{category.emoji}</span>
                </div>
              )}

              {/* Gradient overlay for legible text over any photo */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(28,25,23,0.75) 0%, rgba(28,25,23,0.15) 55%, transparent 75%)" }}
              />

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base leading-tight">{label}</p>
                  {count > 0 && (
                    <p className="text-white/70 text-xs mt-0.5">{count} {t.countSuffix}</p>
                  )}
                </div>
                <span className="text-white/80 text-lg shrink-0 transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
