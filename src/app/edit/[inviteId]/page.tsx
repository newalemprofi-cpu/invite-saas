import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getTemplate } from "@/lib/templates";
import { parseEditorData } from "@/lib/invite-editor-data";
import { resolveLang } from "@/lib/i18n";
import { getEnabledRecommendedTracks } from "@/lib/recommended-tracks";
import { EditorClient } from "./EditorClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ inviteId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

// Editing content and billing status are separate concerns: DRAFT,
// PENDING_PAYMENT, PUBLISHED, and EXPIRED invites are all editable here.
// The PATCH route this editor autosaves through only ever writes `title`
// and `data` — it never touches status, slug, expiresAt, payments, or
// guests — so opening the constructor on a PUBLISHED invite can never
// re-trigger payment, change the public slug, or clear RSVP/payment
// history. See /dashboard/invites/[id] (Manage) for those concerns.
export default async function EditPage({ params, searchParams }: Props) {
  const { inviteId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const session = await requireAuth();
  const invite = await getInvite(inviteId, session.userId, session.role);
  if (!invite) notFound();

  const d = (invite.data ?? {}) as Record<string, unknown>;
  const initialData = parseEditorData(d, "wedding-rose");
  const tmpl = getTemplate(initialData.templateSlug);
  const recommendedTracks = await getEnabledRecommendedTracks();

  return (
    <EditorClient
      inviteId={invite.id}
      template={tmpl ?? null}
      inviteStatus={invite.status}
      lang={lang}
      initialData={initialData}
      recommendedTracks={recommendedTracks}
    />
  );
}
