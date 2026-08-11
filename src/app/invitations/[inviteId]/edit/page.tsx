import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getDbTemplate, getDbTemplates } from "@/lib/db-templates";
import { getTemplate } from "@/lib/templates";
import { parseEditorData } from "@/lib/invite-editor-data";
import { getEventFormSchema } from "@/lib/event-schema";
import { getFeaturePricing } from "@/lib/feature-pricing";
import { getAdminConfig } from "@/lib/admin-config";
import { getEnabledRecommendedTracks } from "@/lib/recommended-tracks";
import { resolveLang } from "@/lib/i18n";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { EditorClient } from "@/app/edit/[inviteId]/EditorClient";
import { SimpleConstructor } from "@/app/invitations/new/SimpleConstructor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ inviteId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

/**
 * The customer-facing edit route (Part 7/8/9): "Редакторлау" on the
 * dashboard now points here instead of the legacy /edit/[inviteId]. DB
 * Invite.data is the ONLY source of truth for the initial form state — no
 * localStorage/anonymous-draft involvement at all (that mechanism is
 * exclusively for the anonymous pre-account CREATE flow).
 *
 * Mirrors /invitations/new/page.tsx's own fallback rule exactly: only event
 * categories with a real EventFormSchema (currently wedding/sundettoi — see
 * lib/event-schema.ts) get SimpleConstructor; everything else (including
 * legacy invites with no eventCategoryId at all) falls back to the
 * unchanged advanced EditorClient, same as it already does today for those
 * categories in CREATE mode. This is intentionally the same branch, not a
 * new one — no Wedding-only behavior is hardcoded here either.
 */
export default async function InviteEditPage({ params, searchParams }: Props) {
  const { inviteId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);

  const session = await getSession();
  if (!session) redirect(buildLoginUrl({ from: `/invitations/${inviteId}/edit?lang=${lang}`, lang }));

  const invite = await getInvite(inviteId, session.userId, session.role);
  if (!invite) notFound();

  const initialData = parseEditorData((invite.data ?? {}) as Record<string, unknown>, "wedding-rose");
  const schema = getEventFormSchema(initialData.eventCategoryId);

  if (!schema) {
    const tmpl = getTemplate(initialData.templateSlug);
    const recommendedTracks = await getEnabledRecommendedTracks();
    return (
      <EditorClient
        inviteId={invite.id}
        inviteSlug={invite.slug}
        template={tmpl ?? null}
        inviteStatus={invite.status}
        lang={lang}
        initialData={initialData}
        recommendedTracks={recommendedTracks}
      />
    );
  }

  const tmpl = (await getDbTemplate(initialData.templateSlug)) ?? getTemplate(initialData.templateSlug);
  if (!tmpl) notFound();

  const [featurePricing, adminConfig, sameCategoryTemplates, recommendedTracks] = await Promise.all([
    getFeaturePricing(),
    getAdminConfig(),
    getDbTemplates({ cat: tmpl.category, activeOnly: true }),
    getEnabledRecommendedTracks(),
  ]);

  return (
    <SimpleConstructor
      mode="edit"
      inviteId={invite.id}
      initialData={initialData}
      template={tmpl}
      templates={sameCategoryTemplates}
      schema={schema}
      eventCategoryId={initialData.eventCategoryId}
      lang={lang}
      featurePricing={featurePricing}
      basePrice={adminConfig.price}
      recommendedTracks={recommendedTracks}
    />
  );
}
