import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getTemplate } from "@/lib/templates";
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

  const templateSlug =
    (d.templateSlug as string | undefined) ??
    (d.template as string | undefined) ??
    "wedding-rose";
  const tmpl = getTemplate(templateSlug);

  return (
    <EditorClient
      inviteId={invite.id}
      template={tmpl ?? null}
      inviteStatus={invite.status}
      lang={lang}
      initialData={{
        groomName: (d.groomName as string) ?? "",
        brideName: (d.brideName as string) ?? "",
        date: (d.date as string) ?? "",
        time: (d.time as string) ?? "",
        location: (d.location as string) ?? "",
        mapLink: (d.mapLink as string) ?? "",
        whatsapp: (d.whatsapp as string) ?? "",
        invitationText: (d.invitationText as string) ?? "",
        organizerPhone: (d.organizerPhone as string) ?? "",
        enabledBlocks: (d.enabledBlocks as string[]) ?? ["hero", "countdown", "rsvp"],
        sections: (d.sections as import("./EditorClient").Section[]) ?? [],
        bgColor: (d.bgColor as string) ?? "",
        accentColor: (d.accentColor as string) ?? "",
        fontFamily: (d.fontFamily as string) ?? "serif",
        animationStyle: (d.animationStyle as string) ?? "fade",
        templateSlug,
        bgType: (d.bgType as "color" | "gradient" | "image" | "video") ?? "color",
        bgImageUrl: (d.bgImageUrl as string) ?? "",
        bgVideoUrl: (d.bgVideoUrl as string) ?? "",
        bgGradient: (d.bgGradient as string) ?? "",
        bgBlur: (d.bgBlur as number) ?? 0,
        bgOpacity: (d.bgOpacity as number) ?? 0.4,
        bgOverlay: (d.bgOverlay as string) ?? "rgba(0,0,0,0)",
        galleryUrls: (d.galleryUrls as string[]) ?? [],
        musicUrl: (d.musicUrl as string) ?? "",
        musicTitle: (d.musicTitle as string) ?? "",
        musicEnabled: (d.musicEnabled as boolean) ?? false,
        musicLoop: (d.musicLoop as boolean) ?? false,
        musicAutoplay: (d.musicAutoplay as boolean) ?? false,
        loveStory: (d.loveStory as string) ?? "",
        dressCode: (d.dressCode as string) ?? "",
        wishesText: (d.wishesText as string) ?? "",
        contactsText: (d.contactsText as string) ?? "",
        giftInfo: (d.giftInfo as string) ?? "",
        videoUrl: (d.videoUrl as string) ?? "",
        programItems: (d.programItems as { time: string; label: string }[]) ?? [],
        rsvpText: (d.rsvpText as string) ?? "",
        programText: (d.programText as string) ?? "",
      }}
    />
  );
}
