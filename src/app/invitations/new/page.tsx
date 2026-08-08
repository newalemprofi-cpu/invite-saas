import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDbTemplate } from "@/lib/db-templates";
import { getTemplate } from "@/lib/templates";
import { createInviteFromTemplate } from "@/lib/data/invites";
import { resolveLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ template?: string; lang?: string }>;
}

/**
 * Single entry point for "start building from this template".
 * Handles both branches so the CTA never has to know whether the visitor
 * is authenticated:
 *   - anonymous  -> bounce through register/login, then land right back here
 *   - authenticated -> create the draft invite and open the constructor
 * Never routes the user through /dashboard or back to template selection.
 */
export default async function NewInvitationPage({ searchParams }: Props) {
  const { template, lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);

  if (!template) redirect(`/templates?lang=${lang}`);

  const session = await getSession();
  if (!session) {
    const returnTo = `/invitations/new?template=${encodeURIComponent(template)}&lang=${lang}`;
    redirect(`/auth/register?from=${encodeURIComponent(returnTo)}&lang=${lang}`);
  }

  const tmpl = (await getDbTemplate(template)) ?? getTemplate(template);
  if (!tmpl) redirect(`/templates?lang=${lang}`);

  let invite: Awaited<ReturnType<typeof createInviteFromTemplate>>;
  try {
    invite = await createInviteFromTemplate(session.userId, tmpl.slug);
  } catch (err) {
    console.error("CREATE_FROM_TEMPLATE_ERROR", err);
    redirect(`/templates/${tmpl.slug}?lang=${lang}&error=create_failed`);
  }

  redirect(`/edit/${invite.id}?lang=${lang}`);
}
