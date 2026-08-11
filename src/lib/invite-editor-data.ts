import type { Template } from "@/lib/templates";
import type { FeatureKey } from "@/lib/features";

export interface Section {
  id: string;
  enabled: boolean;
}

export interface EditorData {
  // Basic
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  location: string;
  mapLink: string;
  whatsapp: string;
  invitationText: string;
  organizerPhone: string;
  // Sections (ordered)
  sections: Section[];
  // Legacy (kept for compat)
  enabledBlocks: string[];
  // Design
  bgColor: string;
  accentColor: string;
  fontFamily: string;
  animationStyle: string;
  templateSlug: string;
  // Background
  bgType: "color" | "gradient" | "image" | "video";
  bgImageUrl: string;
  bgVideoUrl: string;
  bgGradient: string;
  bgBlur: number;
  bgOpacity: number;
  bgOverlay: string;
  // Media
  galleryUrls: string[];
  musicUrl: string;
  musicTitle: string;
  musicEnabled: boolean;
  musicLoop: boolean;
  musicAutoplay: boolean;
  // Block content
  loveStory: string;
  dressCode: string;
  wishesText: string;
  contactsText: string;
  giftInfo: string;
  videoUrl: string;
  programItems: { time: string; label: string }[];
  rsvpText: string;
  programText: string;
  // Simple-constructor additions (§10) — new content fields with no
  // existing equivalent (see lib/event-schema.ts's Wedding/Sundet field
  // lists). Additive: absent/empty on every pre-existing invite.
  address: string;
  hosts: string;
  parents: string;
  note: string;
  age: string;
  // Which of the 8 EVENT_CATEGORIES ids this invite is (lib/event-categories.ts) — drives which EventFormSchema the simple constructor shows.
  eventCategoryId: string;
  // Pre-payment feature "shopping cart" (§17/§20). NOT the same as
  // entitlements (server-only, granted on payment — see lib/entitlements.ts).
  selectedFeatures: FeatureKey[];
  // Free QR toggle (§19) — never affects price.
  qrEnabled: boolean;
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: "hero", enabled: true },
  { id: "countdown", enabled: true },
  { id: "invitation_text", enabled: true },
  { id: "gallery", enabled: false },
  { id: "program", enabled: true },
  { id: "map", enabled: true },
  { id: "rsvp", enabled: true },
  { id: "whatsapp", enabled: false },
  // No "music" section id here on purpose — see the matching comment next
  // to BLOCK_META in EditorClient.tsx. musicEnabled is the sole toggle.
  { id: "love_story", enabled: false },
  { id: "video_section", enabled: false },
  { id: "dress_code", enabled: false },
  { id: "wishes", enabled: false },
  { id: "contacts", enabled: false },
  { id: "gift_info", enabled: false },
];

/** Fresh editor state for a brand-new invitation, seeded from the template's demo content. */
export function buildFreshEditorData(tmpl: Template): EditorData {
  return {
    groomName: tmpl.demoName1,
    brideName: tmpl.demoName2 ?? "",
    date: "",
    time: "",
    location: "",
    mapLink: "",
    whatsapp: "",
    invitationText: "",
    organizerPhone: "",
    sections: DEFAULT_SECTIONS,
    enabledBlocks: DEFAULT_SECTIONS.filter((s) => s.enabled).map((s) => s.id),
    bgColor: "",
    accentColor: "",
    fontFamily: "serif",
    animationStyle: "fade",
    templateSlug: tmpl.slug,
    bgType: "color",
    bgImageUrl: "",
    bgVideoUrl: "",
    bgGradient: "",
    bgBlur: 0,
    bgOpacity: 0.4,
    bgOverlay: "rgba(0,0,0,0)",
    galleryUrls: [],
    musicUrl: "",
    musicTitle: "",
    musicEnabled: false,
    musicLoop: false,
    musicAutoplay: false,
    loveStory: "",
    dressCode: "",
    wishesText: "",
    contactsText: "",
    giftInfo: "",
    videoUrl: "",
    programItems: [],
    rsvpText: "",
    programText: "",
    address: "",
    hosts: "",
    parents: "",
    note: "",
    age: "",
    eventCategoryId: "",
    selectedFeatures: [],
    qrEnabled: true,
  };
}

/** Rehydrates EditorData from a persisted invite's raw JSON `data` blob. */
export function parseEditorData(d: Record<string, unknown>, fallbackTemplateSlug: string): EditorData {
  const templateSlug =
    (d.templateSlug as string | undefined) ?? (d.template as string | undefined) ?? fallbackTemplateSlug;
  return {
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
    sections: (d.sections as Section[]) ?? [],
    bgColor: (d.bgColor as string) ?? "",
    accentColor: (d.accentColor as string) ?? "",
    fontFamily: (d.fontFamily as string) ?? "serif",
    animationStyle: (d.animationStyle as string) ?? "fade",
    templateSlug,
    bgType: (d.bgType as EditorData["bgType"]) ?? "color",
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
    address: (d.address as string) ?? "",
    hosts: (d.hosts as string) ?? "",
    parents: (d.parents as string) ?? "",
    note: (d.note as string) ?? "",
    age: (d.age as string) ?? "",
    eventCategoryId: (d.eventCategoryId as string) ?? "",
    selectedFeatures: Array.isArray(d.selectedFeatures) ? (d.selectedFeatures as FeatureKey[]) : [],
    qrEnabled: typeof d.qrEnabled === "boolean" ? d.qrEnabled : true,
  };
}

/** The exact body shape persisted server-side, shared by autosave (PATCH) and claim (POST). */
export function editorDataToSaveBody(data: EditorData): Record<string, unknown> {
  return {
    groomName: data.groomName || undefined,
    brideName: data.brideName || undefined,
    date: data.date || undefined,
    time: data.time || undefined,
    location: data.location || undefined,
    mapLink: data.mapLink || undefined,
    whatsapp: data.whatsapp || undefined,
    invitationText: data.invitationText || undefined,
    organizerPhone: data.organizerPhone || undefined,
    enabledBlocks: data.sections.filter((s) => s.enabled).map((s) => s.id),
    sections: data.sections,
    bgColor: data.bgColor || undefined,
    accentColor: data.accentColor || undefined,
    fontFamily: data.fontFamily || undefined,
    animationStyle: data.animationStyle || undefined,
    templateSlug: data.templateSlug || undefined,
    bgType: data.bgType,
    bgImageUrl: data.bgImageUrl || undefined,
    bgVideoUrl: data.bgVideoUrl || undefined,
    bgGradient: data.bgGradient || undefined,
    bgBlur: data.bgBlur,
    bgOpacity: data.bgOpacity,
    bgOverlay: data.bgOverlay || undefined,
    galleryUrls: data.galleryUrls,
    musicUrl: data.musicUrl || undefined,
    musicTitle: data.musicTitle || undefined,
    musicEnabled: data.musicEnabled,
    musicLoop: data.musicLoop,
    musicAutoplay: data.musicAutoplay,
    loveStory: data.loveStory || undefined,
    dressCode: data.dressCode || undefined,
    wishesText: data.wishesText || undefined,
    contactsText: data.contactsText || undefined,
    giftInfo: data.giftInfo || undefined,
    videoUrl: data.videoUrl || undefined,
    programItems: data.programItems.length > 0 ? data.programItems : undefined,
    rsvpText: data.rsvpText || undefined,
    programText: data.programText || undefined,
    address: data.address || undefined,
    hosts: data.hosts || undefined,
    parents: data.parents || undefined,
    note: data.note || undefined,
    age: data.age || undefined,
    eventCategoryId: data.eventCategoryId || undefined,
    selectedFeatures: data.selectedFeatures,
    qrEnabled: data.qrEnabled,
  };
}
