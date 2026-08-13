import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminConfig } from "@/lib/admin-config";
import { getSession } from "@/lib/auth";
import { resolveLang } from "@/lib/i18n";
import { getSiteContent } from "@/lib/site-content";
import { getDbTemplates } from "@/lib/db-templates";
import { getPublicUrl } from "@/lib/storage";
import { EVENT_CATEGORIES, eventCategoryLabel } from "@/lib/event-categories";
import { SiteHeader } from "@/components/home/SiteHeader";
import { Hero } from "@/components/home/Hero";
import { CategoryGallery, type CategoryCardData } from "@/components/home/CategoryGallery";
import { FeaturedTemplates } from "@/components/home/FeaturedTemplates";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Benefits } from "@/components/home/Benefits";
import { FinalCta } from "@/components/home/FinalCta";
import { SiteFooter } from "@/components/home/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шақыру — Онлайн шақыру жасаңыз",
  description:
    "Үйлену той, ұзату, туылған күн үшін премиум цифрлы шақырулар. 5 минутта дайын. Kaspi арқылы төлеу.",
};

interface Props {
  searchParams: Promise<{ lang?: string }>;
}

const FEATURED_FALLBACK_COUNT = 4;

export default async function HomePage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const session = await getSession();

  // A returning customer opening the homepage should land on their
  // invitations, not be pushed through the marketing homepage again. Admin
  // sessions are deliberately excluded — opening "/" must never force an
  // admin into the customer dashboard. The explicit "+ Жаңа" button on that
  // dashboard links straight to /templates, never back through "/", so this
  // redirect can never trap an authenticated user who wants a NEW invite.
  if (session && session.role === "USER") {
    redirect(`/dashboard?lang=${lang}`);
  }

  const [config, content, allTemplates] = await Promise.all([
    getAdminConfig(),
    getSiteContent(),
    getDbTemplates({ activeOnly: true }),
  ]);

  // Category cards: default order is EVENT_CATEGORIES' own order; admin's
  // `categoryOrder` (a list of ids) takes precedence for any ids it names,
  // with everything else appended afterward in default order. Hidden
  // categories are dropped entirely.
  const visibleCategories = EVENT_CATEGORIES.filter((c) => !content.hiddenCategories.includes(c.id));
  const orderedCategories = [
    ...content.categoryOrder.map((id) => visibleCategories.find((c) => c.id === id)).filter((c): c is typeof visibleCategories[number] => !!c),
    ...visibleCategories.filter((c) => !content.categoryOrder.includes(c.id)),
  ];
  // Admin's per-category title/description override (Site CMS → "Мереке
  // категориялары"), resolved for the active locale only — an empty custom
  // title falls back to the canonical labelKk/labelRu, an empty
  // description simply renders nothing (see CategoryGallery).
  const categoryCards: CategoryCardData[] = orderedCategories.map((category) => {
    const override = content.categoryContent[category.id];
    const title = (lang === "ru" ? override?.titleRu : override?.titleKk)?.trim() || eventCategoryLabel(category, lang);
    const description = ((lang === "ru" ? override?.descriptionRu : override?.descriptionKk) ?? "").trim();
    return {
      category,
      coverUrl: content.categoryCovers[category.id] ? getPublicUrl(content.categoryCovers[category.id]) : null,
      count: allTemplates.filter((t) => t.category === category.cat).length,
      title,
      description,
    };
  });

  // Featured templates: admin's explicit picks, in the order they picked
  // them; falls back to the first few active templates so the section is
  // never empty out of the box, without ever inventing fake records.
  const featuredTemplates =
    content.featuredTemplateSlugs.length > 0
      ? content.featuredTemplateSlugs
          .map((slug) => allTemplates.find((t) => t.slug === slug))
          .filter((t): t is (typeof allTemplates)[number] => !!t)
      : allTemplates.slice(0, FEATURED_FALLBACK_COUNT);

  // Hero phone-mockup preview (Site CMS → "Hero алдын ала көрінісі"):
  // 1) admin's custom uploaded screenshot always wins if set,
  // 2) else the admin's picked template (rendered with real template style
  //    tokens, same as the /templates/[slug] preview),
  // 3) else a graceful default — the first featured template, or else the
  //    first active template — never a fake/synthetic record.
  const heroPreviewImageUrl = content.heroPreviewImage ? getPublicUrl(content.heroPreviewImage) : null;
  const heroPreviewTemplate =
    allTemplates.find((t) => t.slug === content.heroPreviewTemplateSlug) ??
    featuredTemplates[0] ??
    allTemplates[0] ??
    null;

  // Admin's configured marketing-CTA color, exposed as CSS custom
  // properties ONLY on this page's DOM subtree — .btn-gold/.btn-outline
  // read them with a hardcoded-gold fallback (see globals.css :root), so
  // every other route (admin/dashboard/editor) is entirely unaffected.
  const colorVars = {
    "--color-primary": content.primaryColor,
    "--color-primary-foreground": content.primaryColorForeground,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ivory)", fontFamily: "var(--font-montserrat)", ...colorVars }}
    >
      <SiteHeader lang={lang} authenticated={!!session} />
      <Hero
        lang={lang}
        content={content}
        previewImageUrl={heroPreviewImageUrl}
        previewTemplate={heroPreviewTemplate}
      />
      <CategoryGallery lang={lang} cards={categoryCards} />
      <FeaturedTemplates lang={lang} templates={featuredTemplates} />
      <HowItWorks lang={lang} />
      <Benefits lang={lang} />
      <FinalCta lang={lang} orderWhatsapp={config.orderWhatsapp} />
      <SiteFooter
        lang={lang}
        companyDescription={lang === "ru" ? content.companyDescriptionRu : content.companyDescriptionKk}
        companyPhone={config.companyPhone}
        companyEmail={config.companyEmail}
        orderWhatsapp={config.orderWhatsapp}
        instagramUrl={config.instagramUrl}
        tiktokUrl={config.tiktokUrl}
      />
    </div>
  );
}
