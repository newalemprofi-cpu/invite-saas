import { redirect } from "next/navigation";
import { getDbTemplate, getDbTemplates } from "@/lib/db-templates";
import { getTemplate } from "@/lib/templates";
import { buildFreshEditorData } from "@/lib/invite-editor-data";
import { resolveLang } from "@/lib/i18n";
import { getEnabledRecommendedTracks } from "@/lib/recommended-tracks";
import { getEventFormSchema } from "@/lib/event-schema";
import { getFeaturePricing } from "@/lib/feature-pricing";
import { getAdminConfig } from "@/lib/admin-config";
import { EditorClient } from "@/app/edit/[inviteId]/EditorClient";
import { SimpleConstructor } from "./SimpleConstructor";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ template?: string; lang?: string; eventCategory?: string }>;
}

/**
 * Entry point for "build first, register/pay later": opens a constructor
 * immediately for anyone — no session required, no Invite row created yet.
 * The customer's work lives client-side (localStorage) until they click
 * publish (see /invitations/publish), at which point it's attached to
 * their account.
 *
 * §1/§11: the SIMPLE constructor is now the DEFAULT experience whenever a
 * real EventFormSchema exists for the event category (currently wedding +
 * sundettoi — see lib/event-schema.ts). Every other category falls back to
 * the existing advanced EditorClient unchanged — this is a pure ADDITIVE
 * branch, not a replacement: nothing about the advanced editor's own
 * behavior changed.
 *
 * `eventCategory` disambiguates which of the 8 EVENT_CATEGORIES ids this
 * is when the template's own `category` is a shared style bucket (e.g.
 * "kazakh" covers besiktoi/sundettoi/kudalyk) — threaded through from the
 * homepage category card link. Falls back to the template's bucket value
 * when absent (correct for wedding, where bucket === id 1:1; for the
 * ambiguous "kazakh" bucket without this param, the safe default is no
 * schema match → advanced editor, never a wrong schema).
 */
export default async function NewInvitationPage({ searchParams }: Props) {
  const { template, lang: langParam, eventCategory } = await searchParams;
  const lang = resolveLang(langParam);

  if (!template) redirect(`/templates?lang=${lang}`);

  const tmpl = (await getDbTemplate(template)) ?? getTemplate(template);
  if (!tmpl) redirect(`/templates?lang=${lang}`);

  const resolvedEventCategoryId = eventCategory || tmpl.category;
  const schema = getEventFormSchema(resolvedEventCategoryId);

  if (schema) {
    // Same STYLE BUCKET (tmpl.category, e.g. "wedding") as the initial
    // template — this is exactly the set of templates that are visually
    // compatible/switchable without changing the event schema (§5/§21).
    const [featurePricing, adminConfig, sameCategoryTemplates, recommendedTracks] = await Promise.all([
      getFeaturePricing(),
      getAdminConfig(),
      getDbTemplates({ cat: tmpl.category, activeOnly: true }),
      getEnabledRecommendedTracks(),
    ]);
    return (
      <SimpleConstructor
        template={tmpl}
        templates={sameCategoryTemplates}
        schema={schema}
        eventCategoryId={resolvedEventCategoryId}
        lang={lang}
        featurePricing={featurePricing}
        basePrice={adminConfig.price}
        recommendedTracks={recommendedTracks}
      />
    );
  }

  const recommendedTracks = await getEnabledRecommendedTracks();

  return (
    <EditorClient
      inviteId={null}
      template={tmpl}
      lang={lang}
      initialData={buildFreshEditorData(tmpl)}
      recommendedTracks={recommendedTracks}
    />
  );
}
