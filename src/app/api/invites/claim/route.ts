import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { claimAnonymousInvite, TemplateNotFoundError } from "@/lib/data/invites";
import { FEATURE_KEYS } from "@/lib/features";

// Matches crypto.randomUUID() output from lib/anonymousDraft.ts.
const DRAFT_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors the editable fields accepted by PATCH /api/invites/[id] — same
// invitation data, just arriving as a creation payload instead of a diff.
const dataSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  groomName: z.string().max(50).optional(),
  brideName: z.string().max(50).optional().or(z.literal("")),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().max(200).optional(),
  mapLink: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional(),
  organizerPhone: z.string().max(20).optional(),
  invitationText: z.string().max(2000).optional(),
  enabledBlocks: z.array(z.string()).optional(),
  sections: z.array(z.object({ id: z.string(), enabled: z.boolean() })).optional(),
  bgColor: z.string().max(30).optional(),
  accentColor: z.string().max(30).optional(),
  fontFamily: z.string().max(30).optional(),
  animationStyle: z.string().max(30).optional(),
  templateSlug: z.string().max(60).optional(),
  bgType: z.enum(["color", "gradient", "image", "video"]).optional(),
  bgImageUrl: z.string().max(500).optional().or(z.literal("")),
  bgVideoUrl: z.string().max(500).optional().or(z.literal("")),
  bgGradient: z.string().max(200).optional(),
  bgBlur: z.number().min(0).max(20).optional(),
  bgOpacity: z.number().min(0).max(1).optional(),
  bgOverlay: z.string().max(30).optional(),
  // Hard cap of 10 photos, kept in sync with GalleryUploader's client-side
  // limit and the identical check in PATCH /api/invites/[id]. A claim
  // attempting to sneak more than 10 through a tampered draft is rejected
  // (VALIDATION_ERROR), never silently truncated.
  galleryUrls: z.array(z.string()).max(10).optional(),
  musicUrl: z.string().max(500).optional().or(z.literal("")),
  musicTitle: z.string().max(100).optional(),
  musicEnabled: z.boolean().optional(),
  musicLoop: z.boolean().optional(),
  musicAutoplay: z.boolean().optional(),
  loveStory: z.string().max(2000).optional(),
  dressCode: z.string().max(500).optional(),
  wishesText: z.string().max(1000).optional(),
  contactsText: z.string().max(500).optional(),
  giftInfo: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional().or(z.literal("")),
  programItems: z.array(z.object({ time: z.string(), label: z.string() })).optional(),
  rsvpText: z.string().max(500).optional(),
  programText: z.string().max(1000).optional(),
  // Simple-constructor additions (§10) — genuinely new content fields with
  // no existing equivalent. Additive: absent on every pre-existing row,
  // never required by any reader.
  address: z.string().max(300).optional(),
  hosts: z.string().max(200).optional(),
  parents: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  age: z.string().max(50).optional(),
  // Which of the 8 EVENT_CATEGORIES ids this invite is — drives which
  // EventFormSchema (lib/event-schema.ts) the simple constructor shows.
  eventCategoryId: z.string().max(60).optional(),
  // Pre-payment feature "shopping cart" (§17/§20) — customer can freely
  // add/remove before paying. NEVER confuse with `entitlements`, which is
  // deliberately NOT declared in this schema: zod strips any unknown key
  // on parse, so a client attempting to send `entitlements` directly here
  // is silently dropped, never persisted. Entitlements are only ever
  // written server-side in lib/payment/lifecycle.ts.
  selectedFeatures: z.array(z.enum(FEATURE_KEYS)).max(FEATURE_KEYS.length).optional(),
  // Free QR toggle (§19) — never affects price.
  qrEnabled: z.boolean().optional(),
});

const schema = z.object({
  draftToken: z.string().regex(DRAFT_TOKEN_RE),
  templateSlug: z.string().min(1).max(60),
  data: dataSchema,
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const result = await claimAnonymousInvite({
      userId: session.userId,
      draftToken: parsed.data.draftToken,
      templateSlug: parsed.data.templateSlug,
      data: parsed.data.data,
    });

    if (result.forbidden) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ id: result.id }, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 400 });
    }
    console.error("CLAIM_ERROR", err);
    return NextResponse.json({ error: "CLAIM_FAILED" }, { status: 500 });
  }
}
