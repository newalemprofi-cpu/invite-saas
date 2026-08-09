import { redirect } from "next/navigation";
import { getDbTemplate } from "@/lib/db-templates";
import { getTemplate } from "@/lib/templates";
import { buildFreshEditorData } from "@/lib/invite-editor-data";
import { resolveLang } from "@/lib/i18n";
import { getEnabledRecommendedTracks } from "@/lib/recommended-tracks";
import { EditorClient } from "@/app/edit/[inviteId]/EditorClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ template?: string; lang?: string }>;
}

/**
 * Entry point for "build first, register/pay later": opens the full
 * constructor immediately for anyone — no session required, no Invite row
 * created yet. The customer's work lives client-side (localStorage) until
 * they click publish (see /invitations/publish), at which point it's
 * attached to their account. This intentionally replaces the previous
 * behavior of this route (auth-gate + immediate DB write + redirect).
 */
export default async function NewInvitationPage({ searchParams }: Props) {
  const { template, lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);

  if (!template) redirect(`/templates?lang=${lang}`);

  const tmpl = (await getDbTemplate(template)) ?? getTemplate(template);
  if (!tmpl) redirect(`/templates?lang=${lang}`);

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
