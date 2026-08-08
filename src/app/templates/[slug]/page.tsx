import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbTemplate } from "@/lib/db-templates";
import { getTemplate, localizeTemplate } from "@/lib/templates";
import { getAdminConfig } from "@/lib/admin-config";
import { resolveLang } from "@/lib/i18n";
import { TemplateCreateButton } from "./TemplateCreateButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; error?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tmpl = (await getDbTemplate(slug)) ?? getTemplate(slug);
  if (!tmpl) return {};
  return {
    title: `${tmpl.nameKk} — Шаблон — Шақыру`,
    description: tmpl.descKk,
  };
}

const CATEGORY_LABEL = {
  kk: {
    wedding: "Үйлену той",
    uzatu: "Қыз ұзату",
    birthday: "Туған күн",
    kazakh: "Қазақша дәстүр",
    corporate: "Корпоратив",
    minimal: "Минимал",
  },
  ru: {
    wedding: "Свадьба",
    uzatu: "Қыз ұзату",
    birthday: "День рождения",
    kazakh: "Казахские традиции",
    corporate: "Корпоратив",
    minimal: "Минимал",
  },
} as const;

const T = {
  kk: {
    back: "← Шаблондар",
    heroInviteWedding: "Үйлену тойға шақырамыз",
    heroInviteBirthday: "Туылған күнге шақырамыз",
    heroInviteGeneric: "Іс-шараға шақырамыз",
    rsvp: "Қатысуымды растау ✓",
    premium: "Premium",
    whatsIncluded: "Не кіреді?",
    features: [
      "Кері санақ таймері",
      "Қатысуды растау формасы",
      "Карта сілтемесі",
      "WhatsApp байланысы",
      "Жеке шақыру хаты",
      "90 күн белсенді сілтеме",
    ],
    startingPrice: "Бастаушы баға",
    waCta: "WhatsApp арқылы тапсырыс беру",
    freeReg: "Тіркелу тегін · Жариялаған кезде ғана төлем",
    noTemplates: "Бұл санатта шаблондар жоқ",
    footer: "Қазақстандық премиум цифрлы шақыру сервисі",
    errorBanner: "Шақыруды жасау кезінде қате шықты. Қайталап көріңіз.",
    days: "күн",
    hours: "сағ",
    mins: "мин",
  },
  ru: {
    back: "← Шаблоны",
    heroInviteWedding: "Приглашаем на свадьбу",
    heroInviteBirthday: "Приглашаем на день рождения",
    heroInviteGeneric: "Приглашаем на мероприятие",
    rsvp: "Подтвердить участие ✓",
    premium: "Premium",
    whatsIncluded: "Что входит?",
    features: [
      "Таймер обратного отсчёта",
      "Форма подтверждения участия",
      "Ссылка на карту",
      "Связь через WhatsApp",
      "Персональный текст приглашения",
      "90 дней активная ссылка",
    ],
    startingPrice: "Стартовая цена",
    waCta: "Заказать через WhatsApp",
    freeReg: "Регистрация бесплатна · Оплата только при публикации",
    noTemplates: "В этой категории пока нет шаблонов",
    footer: "Премиальный сервис цифровых приглашений в Казахстане",
    errorBanner: "Не удалось создать приглашение. Попробуйте ещё раз.",
    days: "дн",
    hours: "ч",
    mins: "мин",
  },
} as const;

export default async function TemplateDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: langParam, error } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  const [tmpl, config] = await Promise.all([
    getDbTemplate(slug).then((t) => t ?? getTemplate(slug) ?? null),
    getAdminConfig(),
  ]);

  if (!tmpl) notFound();

  const localized = localizeTemplate(tmpl, lang);
  const langLabel = lang === "ru" ? "Русский" : "Қазақша";
  const categoryLabel =
    CATEGORY_LABEL[lang][tmpl.category as keyof (typeof CATEGORY_LABEL)["kk"]] ?? tmpl.category;
  const waText = encodeURIComponent(
    `Сәлем! Онлайн шақыру жасатқым келеді. Тіл: ${langLabel}. Мереке: ${categoryLabel}. Шаблон: ${localized.name}.`
  );
  const waPhone = config.whatsapp.replace(/\D/g, "");
  const waHref = `https://wa.me/${waPhone}?text=${waText}`;

  const heroLine =
    tmpl.category === "wedding"
      ? t.heroInviteWedding
      : tmpl.category === "birthday"
      ? t.heroInviteBirthday
      : t.heroInviteGeneric;

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(250,248,243,0.9)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={`/templates?lang=${lang}`}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            {t.back}
          </Link>
          <Link href="/" className="font-serif text-xl font-semibold" style={{ color: "var(--charcoal)" }}>
            Шақыру
          </Link>
          <div className="w-24" />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Phone preview */}
          <div className="flex justify-center lg:sticky lg:top-24">
            <div className="phone-frame w-[260px]">
              <div className="phone-screen" style={{ height: 520 }}>
                <div className={`h-full bg-gradient-to-br ${tmpl.gradient} flex flex-col`}>
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <span className="text-5xl">{tmpl.emoji}</span>
                    <div>
                      <p className="label-caps mb-2" style={{ color: tmpl.textMuted }}>
                        {heroLine}
                      </p>
                      <p className="font-serif text-2xl font-semibold leading-tight" style={{ color: tmpl.textDark }}>
                        {tmpl.demoName1}
                        {tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}
                      </p>
                    </div>
                    <div
                      className="w-full h-px opacity-30"
                      style={{ background: `linear-gradient(90deg, transparent, ${tmpl.accent}, transparent)` }}
                    />
                    <div style={{ color: tmpl.textMuted }}>
                      <p className="font-serif text-lg">15 маусым 2026</p>
                      <p className="text-sm mt-0.5">18:00 · Алматы</p>
                    </div>
                    <button
                      className="mt-1 px-5 py-2 rounded-full text-sm font-semibold text-white"
                      style={{ background: tmpl.accent }}
                    >
                      {t.rsvp}
                    </button>
                  </div>
                  <div
                    className="px-4 py-3 flex justify-around"
                    style={{
                      background: tmpl.dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)",
                      borderTop: `1px solid ${tmpl.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
                    }}
                  >
                    {[{ n: "32", l: t.days }, { n: "14", l: t.hours }, { n: "27", l: t.mins }].map((tk) => (
                      <div key={tk.l} className="text-center">
                        <p className="font-serif text-xl font-bold" style={{ color: tmpl.textDark }}>{tk.n}</p>
                        <p className="text-xs" style={{ color: tmpl.textMuted }}>{tk.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info + CTA */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {tmpl.isPremium && (
                  <span
                    className="label-caps px-3 py-1 rounded-full"
                    style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)", border: "1px solid rgba(196,150,62,0.2)" }}
                  >
                    {t.premium}
                  </span>
                )}
                <span
                  className="label-caps px-3 py-1 rounded-full"
                  style={{ background: "rgba(28,25,23,0.06)", color: "var(--muted)" }}
                >
                  {categoryLabel}
                </span>
              </div>
              <h1 className="heading-display text-4xl sm:text-5xl mb-3" style={{ color: "var(--charcoal)" }}>
                {localized.name}
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                {localized.description}
              </p>
            </div>

            {/* Tags */}
            {localized.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localized.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "white", color: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Included features */}
            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>{t.whatsIncluded}</h3>
              <ul className="flex flex-col gap-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "var(--charcoal)" }}>
                    <span style={{ color: "var(--gold)" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {t.errorBanner}
              </div>
            )}

            {/* Price + CTA */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-5"
              style={{ background: "var(--charcoal)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs mb-1" style={{ color: "#6E6560" }}>{t.startingPrice}</p>
                  <p className="font-serif text-3xl font-bold" style={{ color: "#FAF8F3" }}>
                    {config.price.toLocaleString("kk-KZ")}{" "}
                    <span className="text-xl font-normal" style={{ color: "var(--gold)" }}>₸</span>
                  </p>
                </div>
                <span className="text-3xl">{tmpl.emoji}</span>
              </div>

              <TemplateCreateButton templateSlug={tmpl.slug} lang={lang} />

              {/* WhatsApp alternative */}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#25D366", color: "white" }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.waCta}
              </a>

              <p className="text-xs text-center" style={{ color: "#6E6560" }}>
                {t.freeReg}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
