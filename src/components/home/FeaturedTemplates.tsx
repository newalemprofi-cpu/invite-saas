import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { localizeTemplate, type Template } from "@/lib/templates";

interface Props {
  lang: Lang;
  templates: Template[];
}

const T = {
  kk: {
    title: "Танымал шақыру үлгілері",
    preview: "Алдын ала қарау",
    select: "Осы үлгіні таңдау",
    premium: "Premium",
  },
  ru: {
    title: "Популярные шаблоны",
    preview: "Предпросмотр",
    select: "Выбрать шаблон",
    premium: "Premium",
  },
} as const;

/**
 * Real templates from the DB (same source /templates itself reads) — no
 * fabricated records. Shows the admin-uploaded previewImage when a
 * template has one; falls back to the gradient/emoji/demo-name card
 * otherwise (see InviteTemplate.previewImage — admin-manageable via
 * /admin/templates).
 */
export function FeaturedTemplates({ lang, templates }: Props) {
  const t = T[lang];
  if (templates.length === 0) return null;

  return (
    <section className="py-14 sm:py-20" style={{ background: "var(--cream)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="heading-display text-3xl sm:text-4xl text-center mb-10" style={{ color: "var(--charcoal)" }}>
          {t.title}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {templates.map((tmpl) => {
            const localized = localizeTemplate(tmpl, lang);
            return (
              <div
                key={tmpl.id}
                className="rounded-3xl overflow-hidden flex flex-col"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(28,25,23,0.06)" }}
              >
                {tmpl.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tmpl.previewImage} alt={localized.name} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className={`h-40 bg-gradient-to-br ${tmpl.gradient} flex flex-col items-center justify-center gap-2.5 p-5`}>
                    <span className="text-3xl leading-none">{tmpl.emoji}</span>
                    <p className="font-serif text-lg font-semibold leading-tight text-center" style={{ color: tmpl.textDark }}>
                      {tmpl.demoName1}{tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}
                    </p>
                  </div>
                )}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm" style={{ color: "var(--charcoal)" }}>{localized.name}</h3>
                      {tmpl.isPremium && (
                        <span
                          className="label-caps shrink-0 px-2 py-0.5 rounded-full text-[9px]"
                          style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)", border: "1px solid rgba(196,150,62,0.2)" }}
                        >
                          {t.premium}
                        </span>
                      )}
                    </div>
                    {localized.description && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{localized.description}</p>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <Link href={`/templates/${tmpl.slug}?lang=${lang}`} className="btn-gold justify-center text-xs py-2.5">
                      {t.select}
                    </Link>
                    <Link href={`/templates/${tmpl.slug}?lang=${lang}`} className="text-xs font-medium text-center" style={{ color: "var(--muted)" }}>
                      {t.preview}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
