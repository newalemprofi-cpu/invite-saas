import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getTemplate } from "@/lib/templates";
import { parseEditorData } from "@/lib/invite-editor-data";
import { resolveLang } from "@/lib/i18n";
import { EditorClient } from "./EditorClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ inviteId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function EditPage({ params, searchParams }: Props) {
  const { inviteId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const session = await requireAuth();
  const invite = await getInvite(inviteId, session.userId, session.role);
  if (!invite) notFound();

  if (invite.status === "PUBLISHED") {
    redirect(`/dashboard/invites/${invite.id}`);
  }

  const d = (invite.data ?? {}) as Record<string, unknown>;
  const initialData = parseEditorData(d, "wedding-rose");
  const tmpl = getTemplate(initialData.templateSlug);

  return (
    <EditorClient
      inviteId={invite.id}
      template={tmpl ?? null}
      inviteStatus={invite.status}
      lang={lang}
      initialData={initialData}
    />
  );
}
