import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbTemplate } from "@/lib/db-templates";
import { getTemplate, localizeTemplate } from "@/lib/templates";
import { getAdminConfig } from "@/lib/admin-config";
import { resolveLang } from "@/lib/i18n";
import { FEATURE_KEYS } from "@/lib/features";
import { InvitationView, type D } from "@/app/i/[slug]/InvitationView";
import { TemplateCreateButton } from "./TemplateCreateButton";
import { resolveStoredImage } from "@/lib/storage";
import { getEnabledRecommendedTracks } from "@/lib/recommended-tracks";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; eventCategory?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tmpl = (await getDbTemplate(slug)) ?? getTemplate(slug);
  if (!tmpl) return {};
  return {
    title: `${tmpl.nameKk} — Толық көру — Шақыру`,
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
    back: "← Шаблондарға",
    ctaKicker: "Осы дизайн ұнады ма?",
    choosePrimary: "Осы шаблонды таңдаймын",
    waCta: "WhatsApp арқылы тапсырыс беру",
    freeReg: "Тіркелу тегін · Жариялаған кезде ғана төлем",
  },
  ru: {
    back: "← К шаблонам",
    ctaKicker: "Понравился этот дизайн?",
    choosePrimary: "Выбрать этот шаблон",
    waCta: "Заказать через WhatsApp",
    freeReg: "Регистрация бесплатна · Оплата только при публикации",
  },
} as const;

// Demo invitation copy — template/demo content only, never real customer
// data, matching the exact style already used for the constructor's own
// schema-driven defaults (lib/event-schema.ts).
const DEMO_TEXT = {
  kk: {
    invitationText: "Құрметті ағайын-туыс, бауырлар, құда-жекжат, дос-жарандар!\nСіздерді қуанышымызға ортақ болып,\nтойымыздың қадірлі қонағы болуға шақырамыз.",
    programText: "18:00 — Қонақтарды қарсы алу\n19:00 — Той басталады\n21:00 — Би кеші",
    location: "Grand Hall",
    address: "Алматы, әл-Фараби даңғылы 77",
  },
  ru: {
    invitationText: "Дорогие родные, друзья и близкие!\nПриглашаем вас разделить с нами радость и стать почётными гостями нашего торжества.",
    programText: "18:00 — Встреча гостей\n19:00 — Начало торжества\n21:00 — Танцевальный вечер",
    location: "Grand Hall",
    address: "Алматы, пр. аль-Фараби 77",
  },
} as const;

/**
 * The full invitation demo — "Толық көру" from a template card lands here.
 * Renders the EXACT SAME InvitationView the real published invitation uses
 * (/i/[slug]), fed with the template's admin-configured demo content (see
 * InviteTemplate.demoContent / lib/template-demo.ts, edited from Admin →
 * Templates → "Толық демо") — falling back field-by-field to the template's
 * existing demoName1/demoName2/demoImage/previewImage and generic localized
 * placeholder copy for anything not yet configured. Never real customer
 * data, and no Invite/RSVP/Wish/Payment row is ever created or touched just
 * by viewing this page.
 */
export default async function TemplateDemoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: langParam, eventCategory } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  const [tmpl, config, tracks] = await Promise.all([
    getDbTemplate(slug).then((row) => row ?? getTemplate(slug) ?? null),
    getAdminConfig(),
    getEnabledRecommendedTracks(),
  ]);
  if (!tmpl) notFound();

  const localized = localizeTemplate(tmpl, lang);
  const categoryLabel = CATEGORY_LABEL[lang][tmpl.category as keyof (typeof CATEGORY_LABEL)["kk"]] ?? tmpl.category;
  const langLabel = lang === "ru" ? "Русский" : "Қазақша";
  const waMessage =
    lang === "ru"
      ? `Здравствуйте! Хочу заказать онлайн-приглашение.\nЯзык: ${langLabel}.\nМероприятие: ${categoryLabel}.\nШаблон: ${localized.name}.`
      : `Сәлем! Онлайн шақыру жасатқым келеді.\nТіл: ${langLabel}.\nМереке: ${categoryLabel}.\nШаблон: ${localized.name}.`;
  const waPhone = config.orderWhatsapp.replace(/\D/g, "");
  const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

  const backHref = `/templates?lang=${lang}&cat=${encodeURIComponent(tmpl.category)}${eventCategory ? `&eventCategory=${encodeURIComponent(eventCategory)}` : ""}`;

  // Demo data (§11/§12): admin-configured content (InviteTemplate.demoContent
  // — see lib/template-demo.ts) takes priority field-by-field; any field the
  // admin hasn't set yet falls back to the template's existing
  // demoName1/demoName2/demoImage/previewImage or the generic localized
  // placeholder copy below, so a template with zero admin-configured demo
  // content renders exactly as it always did (incremental migration, §12).
  const dc = tmpl.demoContent ?? {};
  const demo = DEMO_TEXT[lang];

  const configuredPhoto = dc.mainPhoto ? resolveStoredImage(dc.mainPhoto) : null;
  const demoPhoto = configuredPhoto ?? tmpl.demoImage ?? tmpl.previewImage ?? null;

  const configuredGallery = dc.gallery && dc.gallery.length > 0
    ? dc.gallery.map((key) => resolveStoredImage(key)).filter((u): u is string => !!u)
    : null;
  const galleryUrls = configuredGallery ?? Array.from(new Set([tmpl.demoImage, tmpl.previewImage].filter((k): k is string => !!k)));

  // Never a permanently-hardcoded date (§8): admin's own configured date if
  // set, else always ~4 months out from "now" so the countdown section
  // always shows a real, non-zero, non-expired value no matter when the
  // demo is viewed.
  let demoDateStr = dc.date;
  if (!demoDateStr) {
    const fallbackDate = new Date();
    fallbackDate.setMonth(fallbackDate.getMonth() + 4);
    demoDateStr = fallbackDate.toISOString().slice(0, 10);
  }

  const track = dc.musicTrackId ? tracks.find((tr) => tr.id === dc.musicTrackId) : undefined;

  const mapLink = dc.mapLink || undefined;

  const d: D = {
    templateSlug: tmpl.slug,
    groomName: dc.groomName || tmpl.demoName1,
    brideName: dc.brideName ?? tmpl.demoName2 ?? null,
    hosts: dc.hosts,
    date: demoDateStr,
    time: dc.time || "18:00",
    location: dc.location || demo.location,
    address: dc.address || demo.address,
    mapLink,
    invitationText: (lang === "ru" ? dc.invitationTextRu : dc.invitationTextKk) || demo.invitationText,
    programText: (lang === "ru" ? dc.programTextRu : dc.programTextKk) || demo.programText,
    note: lang === "ru" ? dc.noteRu : dc.noteKk,
    bgImageUrl: demoPhoto,
    bgType: demoPhoto ? "image" : "color",
    galleryUrls,
    musicUrl: track?.url,
    musicEnabled: !!track,
    sections: [
      { id: "hero", enabled: true },
      { id: "countdown", enabled: true },
      { id: "invitation_text", enabled: true },
      { id: "gallery", enabled: galleryUrls.length > 0 },
      { id: "program", enabled: true },
      { id: "map", enabled: !!mapLink },
      { id: "rsvp", enabled: true },
      { id: "wishes", enabled: true },
    ],
  };

  return (
    <div style={{ background: "var(--ivory)" }}>
      {/* Subtle floating back-nav — a small overlay pill, never a full-width
          bar competing with the invitation's own hero design. Readable over
          both light and dark templates. */}
      <Link
        href={backHref}
        className="fixed top-4 left-4 z-[60] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium backdrop-blur transition-opacity hover:opacity-80"
        style={{ background: "rgba(28,25,23,0.55)", color: "#FAF8F3" }}
      >
        {t.back}
      </Link>

      {/* The full, real invitation — same renderer as the published site. */}
      <InvitationView d={d} tmpl={tmpl} entitled={FEATURE_KEYS} wishes={[]} isPreview={false} invite={null} />

      {/* SaaS controls around the demo — deliberately styled with the
          platform's own ivory/gold/charcoal language (not the template's
          accent colors) so they never read as invitation content. */}
      <div className="py-14 px-4" style={{ background: "var(--ivory)", borderTop: "4px solid var(--gold)" }}>
        <div className="max-w-md mx-auto flex flex-col items-center gap-5 text-center">
          <p className="label-caps" style={{ color: "var(--gold)" }}>{t.ctaKicker}</p>
          <div className="w-full flex flex-col gap-3">
            <TemplateCreateButton templateSlug={tmpl.slug} lang={lang} eventCategory={eventCategory} />
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
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{t.freeReg}</p>
        </div>
      </div>
    </div>
  );
}
