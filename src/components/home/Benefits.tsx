import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
}

// Every item here is a real, shipped product capability — see RSVPForm,
// MusicPlayer, gallery uploads (uploads.tsx), and the map block in
// /i/[slug]/page.tsx. Nothing promised that doesn't exist.
const T = {
  kk: {
    items: [
      { icon: "🎨", label: "Дайын кәсіби дизайн" },
      { icon: "📱", label: "Телефонға бейімделген" },
      { icon: "🎵", label: "Музыка" },
      { icon: "🖼️", label: "Фото галерея" },
      { icon: "📍", label: "Карта" },
      { icon: "✅", label: "RSVP / қонақ жауабы" },
      { icon: "🔗", label: "Бір сілтемемен бөлісу" },
    ],
  },
  ru: {
    items: [
      { icon: "🎨", label: "Готовый профессиональный дизайн" },
      { icon: "📱", label: "Адаптировано под телефон" },
      { icon: "🎵", label: "Музыка" },
      { icon: "🖼️", label: "Фотогалерея" },
      { icon: "📍", label: "Карта" },
      { icon: "✅", label: "RSVP / ответы гостей" },
      { icon: "🔗", label: "Одна ссылка для всех" },
    ],
  },
} as const;

export function Benefits({ lang }: Props) {
  const t = T[lang];
  return (
    <section className="py-14 sm:py-20" style={{ background: "var(--cream)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {t.items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-full px-5 py-3"
              style={{ background: "white", border: "1px solid var(--border)" }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
