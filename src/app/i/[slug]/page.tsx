import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { readFeatureState } from "@/lib/entitlements";
import { getTemplate } from "@/lib/templates";
import { getDbTemplate } from "@/lib/db-templates";
import { collectAssetIds } from "@/lib/visual-config";
import { resolveAssetUrls } from "@/lib/template-assets";
import { InvitationView, type D } from "./InvitationView";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invite = await db.invite.findUnique({ where: { slug }, select: { title: true, status: true } });
  // Unpublished invites are guessable by slug — never leak their title (couple
  // names, event subject) via <title>/OG/description before payment confirms.
  if (!invite || invite.status !== "PUBLISHED") return {};
  return {
    title: `${invite.title} — Шақыру`,
    description: `Сізді ${invite.title} шарасына шақырамыз`,
  };
}

function Gate({ emoji, title, msg }: { emoji: string; title: string; msg: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-6" style={{ background: "var(--ivory)" }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ background: "rgba(196,150,62,0.08)", border: "1px solid rgba(196,150,62,0.2)" }}>
        {emoji}
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: "var(--charcoal)" }}>{title}</h1>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>{msg}</p>
      </div>
      <Link href="/" className="btn-gold text-sm">Өз шақыруыңызды жасаңыз →</Link>
    </div>
  );
}

/**
 * Real published invitations. Thin data-fetching wrapper only — the actual
 * rendering is InvitationView.tsx, the SAME renderer the template
 * full-preview demo route (/templates/[slug]) uses. Everything here is
 * either DB-lookup/auth/gating logic that has no business inside a
 * presentational component, or genuinely public-page-only concerns (the
 * Gate screens, the view-count increment) that a demo has no equivalent of.
 */
export default async function PublicInvitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const invite = await db.invite.findUnique({ where: { slug } });
  if (!invite) notFound();

  db.invite.update({ where: { id: invite.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  let isPreview = false;
  if (preview === "1") {
    const s = await getSession();
    isPreview = s?.userId === invite.userId || s?.role === "ADMIN";
  }

  const now = new Date();
  const expired = invite.status === "EXPIRED" || (invite.status === "PUBLISHED" && invite.expiresAt !== null && invite.expiresAt < now);

  if (expired && !isPreview) return <Gate emoji="⏳" title={invite.title} msg="Бұл шақырудың мерзімі аяқталды. RSVP қабылдау тоқтатылды." />;
  // Never render the real title here: unpublished invites are reachable by
  // guessing/enumerating slugs, and the title (couple names, event subject)
  // was never made public — unlike the expired-invite gate above, whose
  // invite was PUBLISHED (and thus its title already public) at some point.
  if (invite.status !== "PUBLISHED" && !isPreview) return <Gate emoji="💌" title="Шақыру" msg="Бұл шақыру әлі белсенді емес. Жарияланғаннан кейін қолжетімді болады." />;

  const d = (invite.data ?? {}) as D;

  // Which paid add-ons this specific invite is entitled to, per the
  // purchase snapshot (see lib/entitlements.ts / lib/payment/lifecycle.ts)
  // — NEVER re-derived from current admin pricing. Invites that predate
  // this system entirely (no `entitlements` key ever written) are
  // grandfathered to FULL access by readFeatureState() itself — see its
  // own comment — so a pre-existing published invite's music/gallery/RSVP/
  // map keep working exactly as before this task.
  const entitled = readFeatureState(invite.data).entitlements;
  const wishes = entitled.includes("wishes")
    ? await db.wish.findMany({ where: { inviteId: invite.id }, orderBy: { createdAt: "desc" }, take: 100 })
    : [];

  // Resolve template: static list first (fast), then DB for admin-created templates
  const newSlug = d.templateSlug ?? d.template ?? null;
  const tmpl = newSlug
    ? (getTemplate(newSlug) ?? (await getDbTemplate(newSlug)) ?? null)
    : null;

  // Full Production Template Designer task (§14) — resolve every Template
  // Asset Library reference this template's visualConfig makes (section
  // backgrounds + decorations) in ONE batched DB query, server-side, before
  // handing InvitationView a plain assetId→URL object (see that prop's own
  // doc for why the resolution can't happen inside InvitationView itself).
  const assetIds = collectAssetIds(tmpl?.visualConfig ?? null);
  const assetUrls = assetIds.length > 0 ? Object.fromEntries(await resolveAssetUrls(assetIds)) : undefined;

  return (
    <InvitationView
      d={d}
      tmpl={tmpl}
      entitled={entitled}
      wishes={wishes}
      isPreview={isPreview}
      invite={{ id: invite.id, status: invite.status }}
      assetUrls={assetUrls}
    />
  );
}
