"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";

// ── Types ─────────────────────────────────────────────────────────────

export interface InviteContext {
  groomName?: string;
  brideName?: string;
  eventType?: string;
  date?: string;
  time?: string;
  location?: string;
  templateSlug?: string;
  templateName?: string;
  templateDescription?: string;
  invitationText?: string;
  bgColor?: string;
  accentColor?: string;
  fontFamily?: string;
  musicTitle?: string;
  musicEnabled?: boolean;
}

export type GenerationType =
  | "romantic" | "kazakh" | "modern"
  | "rsvp" | "thanks" | "welcome" | "reminder"
  | "suggest_colors" | "suggest_music" | "suggest_template"
  | "explain_editor" | "chat" | "full";

export interface AIResult {
  text?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  isText?: boolean;
}

export interface FullGenerationResult {
  invitationText?: string;
  bgColor?: string;
  accentColor?: string;
  fontFamily?: "serif" | "sans" | "display";
  musicTitle?: string;
  timeline?: Array<{ time: string; title: string }>;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ConversationData {
  conversationId: string;
  messages: Array<{
    role: string;
    content: string;
    type: string | null;
    isText: boolean;
    createdAt: Date;
  }>;
}

export interface TemplateRecommendation {
  slug: string;
  name: string;
  emoji: string;
  bg: string;
  gradient: string;
  accent: string;
  textDark: string;
  textMuted: string;
  reason: string;
  isPremium: boolean;
  price: number;
}

export interface MusicSuggestion {
  title: string;
  artist: string;
  style: string;
  mood: string;
  youtubeQuery: string;
}

export interface ColorPalette {
  name: string;
  mood: string;
  primary: string;
  accent: string;
  background: string;
}

export interface ImagePrompts {
  cover: string;
  gallery: string;
  background: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const TEXT_TYPES = new Set<GenerationType>([
  "romantic", "kazakh", "modern", "rsvp", "thanks", "welcome", "reminder",
]);

const MODE_LABELS: Record<string, string> = {
  romantic: "❤️ Романтикалық", kazakh: "🇰🇿 Қазақша", modern: "✨ Заманауи",
  rsvp: "RSVP", thanks: "Алғыс", welcome: "Қарсы алу", reminder: "Еске салу",
  suggest_colors: "🎨 Түс", suggest_music: "🎵 Музыка", suggest_template: "Шаблон",
  explain_editor: "🧠 Редактор", chat: "💬 Сөйлесу", full: "✨ Толық",
  recommend_template: "🎭 Шаблон", suggest_music_list: "🎵 Музыка",
  generate_colors: "🎨 Түс палитра", image_prompts: "📷 Сурет промпт",
};

const EDITOR_GUIDE = `
Редактор мүмкіндіктері (4 қойынды):
1. «Мәлімет» — аттар, күні, уақыты, орны, карта (2GIS/Google), WhatsApp, шақыру хаты
2. «Дизайн» — фон түсі, акцент түсі, қаріп (Cormorant/DM Sans/Playfair), анимация (Fade/Slide/Float)
3. «Блоктар» — Басты, Кері санақ, Бағдарлама, Шақыру хаты, Галерея, Карта, RSVP, WhatsApp, Музыка
4. «Медиа» — галерея (URL, макс. 8 сурет), музыка (MP3 URL + атауы)
Жариялау: «Жариялау →» → Kaspi → Админ растауы → жарияланады.`;

// ── Prompt builders ───────────────────────────────────────────────────

function buildSystemPrompt(context: InviteContext): string {
  const parts: string[] = [];
  if (context.groomName || context.brideName)
    parts.push(`Шақыру иелері: ${[context.groomName, context.brideName].filter(Boolean).join(" & ")}`);
  if (context.eventType) parts.push(`Іс-шара: ${context.eventType}`);
  if (context.date) parts.push(`Күні: ${context.date}`);
  if (context.time) parts.push(`Уақыты: ${context.time}`);
  if (context.location) parts.push(`Орны: ${context.location}`);
  if (context.templateName)
    parts.push(`Шаблон: ${context.templateName}${context.templateDescription ? ` — ${context.templateDescription}` : ""}`);
  if (context.accentColor) parts.push(`Акцент түсі: ${context.accentColor}`);
  if (context.fontFamily) parts.push(`Қаріп: ${context.fontFamily}`);
  if (context.musicEnabled && context.musicTitle) parts.push(`Музыка: ${context.musicTitle}`);
  if (context.invitationText) parts.push(`Қазіргі мәтін: "${context.invitationText}"`);

  const contextBlock = parts.length > 0 ? `\n\nАғымдағы шақыру:\n${parts.join("\n")}` : "";

  return `Сіз — InviteSaaS премиум Қазақстандық той шақыру платформасының AI агентісіз.

Ережелер:
- Мәтін жасағанда ТІКЕЛЕЙ мәтін жаз, кіріспесіз
- Нақты аттар мен орынды пайдалан. Emoji аз, орнымен ғана
- Дизайн ұсынысында нақты hex кодтар бер
- JSON сұрағанда ТІКЕЛЕЙ JSON жаз, басқа ештеңе жоқ${contextBlock}
${EDITOR_GUIDE}`;
}

function modePrompt(type: GenerationType, custom?: string): string {
  switch (type) {
    case "romantic": return "Осы шақыруға романтикалық, жылы, жүрекке жақын қазақша мәтін жаз. Сезімге толы, поэтикалық. Нақты аттар мен орынды кірістір.";
    case "kazakh": return "Дәстүрлі қазақ мәдениетіне сай ресми қазақша шақыру мәтіні жаз. Ата-бабалар дәстүрін ескер.";
    case "modern": return "Заманауи, жеңіл тонда қысқа шақыру мәтіні жаз. Энергиялы, нақты. Бірен-саран ағылшын сөздер болуы мүмкін.";
    case "rsvp": return "Қонақтарға RSVP хабарламасы жаз — жауап беруін сұра, мерзімін ескерт. Жылы, нақты.";
    case "thanks": return "Тойдан кейін қонақтарға алғыс хатының мәтінін жаз. Шынайы, жылы.";
    case "welcome": return "Той басталар алдында қонақтарды қарсы алу хабарламасын жаз.";
    case "reminder": return "Тойға 1-2 күн қалғанда еске салу хабарламасы жаз. Орын, уақыт, шақыруды ескерт.";
    case "explain_editor": return custom ?? "Редактордың барлық мүмкіндіктерін, 4 қойындысын қазақша түсіндір. Қадам-қадам.";
    default: return custom ?? "";
  }
}

// ── Core caller ───────────────────────────────────────────────────────

interface CallSuccess { text: string; inputTokens: number; outputTokens: number }

async function callAnthropic(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 1024
): Promise<CallSuccess | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "AI_NOT_CONFIGURED" };

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system, messages }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      return { error: err?.error?.message ?? "AI сервис қолжетімсіз" };
    }

    const data = await resp.json() as {
      content?: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    return {
      text: data.content?.find((c) => c.type === "text")?.text ?? "",
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  } catch {
    return { error: "Желі қатесі. Қайталаңыз." };
  }
}

function extractJSON(text: string): unknown {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(m ? m[1] : text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)?.[1] ?? text);
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

async function trackUsage(userId: string, type: string, inputTokens: number, outputTokens: number) {
  try {
    await db.auditLog.create({
      data: {
        action: "ai_query", entity: "ai", entityId: userId, userId,
        meta: { type, modeLabel: MODE_LABELS[type] ?? type, inputTokens, outputTokens, total: inputTokens + outputTokens, date: new Date().toISOString().split("T")[0] },
      },
    });
  } catch { /* non-critical */ }
}

// ── Memory ────────────────────────────────────────────────────────────

export async function getOrCreateConversation(inviteId: string): Promise<ConversationData | null> {
  try {
    const session = await getSession();
    if (!session) return null;

    const conv = await db.aiConversation.upsert({
      where: { inviteId_userId: { inviteId, userId: session.userId } },
      create: { inviteId, userId: session.userId },
      update: {},
      include: { messages: { orderBy: { createdAt: "asc" }, take: 60 } },
    });

    return {
      conversationId: conv.id,
      messages: conv.messages.map((m) => ({
        role: m.role, content: m.content, type: m.type,
        isText: TEXT_TYPES.has(m.type as GenerationType), createdAt: m.createdAt,
      })),
    };
  } catch { return null; }
}

export async function askAIWithMemory(
  message: string,
  context: InviteContext,
  type: GenerationType = "chat",
  conversationId?: string
): Promise<AIResult> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const userContent = type === "chat" ? message : modePrompt(type, message || undefined);
  if (!userContent.trim()) return { error: "Сұрақ жазыңыз" };

  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversationId) {
    try {
      const stored = await db.aiMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 20 });
      history = stored.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    } catch { /* proceed without history */ }
  }

  history.push({ role: "user", content: userContent });
  const result = await callAnthropic(buildSystemPrompt(context), history);
  if ("error" in result) return { error: result.error };

  if (conversationId) {
    void db.aiMessage.createMany({
      data: [
        { conversationId, role: "user", content: userContent, type },
        { conversationId, role: "assistant", content: result.text, type, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      ],
    }).catch(() => null);
  }

  void trackUsage(session.userId, type, result.inputTokens, result.outputTokens);
  return { text: result.text, inputTokens: result.inputTokens, outputTokens: result.outputTokens, isText: TEXT_TYPES.has(type) };
}

// ── Full generation ───────────────────────────────────────────────────

export async function generateFullInvite(inviteId: string, context: InviteContext): Promise<FullGenerationResult> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const names = [context.groomName, context.brideName].filter(Boolean).join(" & ") || "Той иелері";
  const info = [context.date && `күні: ${context.date}`, context.time && `уақыты: ${context.time}`, context.location && `орны: ${context.location}`, context.templateName && `стиль: ${context.templateName}`].filter(Boolean).join(", ");

  const prompt = `${names} үйлену тойына барлық контентті JSON форматында жаса.${info ? ` (${info})` : ""}
ТІКЕЛЕЙ JSON:
{"invitationText":"...","bgColor":"#hex","accentColor":"#hex","fontFamily":"serif","musicTitle":"Ән — Орындаушы","timeline":[{"time":"14:00","title":"Қонақтарды қарсы алу"},{"time":"15:00","title":"Той рәсімі"},{"time":"16:30","title":"Тамақ"},{"time":"18:00","title":"Той думаны"}]}
fontFamily: "serif"|"sans"|"display" ғана. Hex нақты болсын.`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 1500);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, "full", result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as { invitationText?: string; bgColor?: string; accentColor?: string; fontFamily?: string; musicTitle?: string; timeline?: Array<{ time: string; title: string }> };
    const validFonts = new Set(["serif", "sans", "display"]);

    // Save to conversation
    try {
      const conv = await db.aiConversation.findUnique({ where: { inviteId_userId: { inviteId, userId: session.userId } } });
      if (conv) {
        void db.aiMessage.createMany({ data: [{ conversationId: conv.id, role: "user", content: "✨ AI толық толтырсын", type: "full" }, { conversationId: conv.id, role: "assistant", content: result.text, type: "full", inputTokens: result.inputTokens, outputTokens: result.outputTokens }] }).catch(() => null);
      }
    } catch { /* non-critical */ }

    return {
      invitationText: parsed.invitationText,
      bgColor: HEX_RE.test(parsed.bgColor ?? "") ? parsed.bgColor : undefined,
      accentColor: HEX_RE.test(parsed.accentColor ?? "") ? parsed.accentColor : undefined,
      fontFamily: validFonts.has(parsed.fontFamily ?? "") ? (parsed.fontFamily as "serif" | "sans" | "display") : "serif",
      musicTitle: parsed.musicTitle,
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : undefined,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    };
  } catch { return { error: "AI жауабын талдау қатесі. Қайталаңыз." }; }
}

// ── Smart Template Recommendation ────────────────────────────────────

export async function recommendTemplates(context: InviteContext): Promise<{
  recommendations?: TemplateRecommendation[];
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const templateList = TEMPLATES.map((t) =>
    `- "${t.slug}": ${t.nameKk} — ${t.descKk} [${t.tags.join(", ")}]`
  ).join("\n");

  const names = [context.groomName, context.brideName].filter(Boolean).join(" & ") || "той иелері";
  const info = [
    context.eventType && `іс-шара: ${context.eventType}`,
    context.date && `күні: ${context.date}`,
    context.location && `орны: ${context.location}`,
    context.accentColor && `ұнаған түс: ${context.accentColor}`,
  ].filter(Boolean).join(", ");

  const prompt = `${names} шақыруына (${info || "той"}) ең сәйкес 3 шаблонды таңда.

Қолжетімді шаблондар:
${templateList}

ТІКЕЛЕЙ JSON:
{"recommendations":[{"slug":"шаблон-slug","reason":"Неге сәйкес — 1 сөйлем"},{"slug":"...","reason":"..."},{"slug":"...","reason":"..."}]}

Ең сәйкес шаблон бірінші болсын.`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 600);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, "recommend_template", result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as { recommendations?: Array<{ slug: string; reason: string }> };
    const recommendations: TemplateRecommendation[] = (parsed.recommendations ?? [])
      .map((r) => {
        const tmpl = TEMPLATES.find((t) => t.slug === r.slug);
        if (!tmpl) return null;
        return {
          slug: tmpl.slug, name: tmpl.nameKk, emoji: tmpl.emoji,
          bg: tmpl.bg, gradient: tmpl.gradient, accent: tmpl.accent,
          textDark: tmpl.textDark, textMuted: tmpl.textMuted,
          reason: r.reason, isPremium: tmpl.isPremium, price: tmpl.price,
        };
      })
      .filter((r): r is TemplateRecommendation => r !== null)
      .slice(0, 3);

    return { recommendations, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch { return { error: "Шаблон ұсынымын жасау қатесі" }; }
}

// ── Auto Music Suggestion ─────────────────────────────────────────────

export async function suggestMusicForInvite(context: InviteContext): Promise<{
  suggestions?: MusicSuggestion[];
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const eventType = context.eventType ?? "wedding";
  const names = [context.groomName, context.brideName].filter(Boolean).join(" & ");

  const prompt = `${names ? `${names} ` : ""}${eventType} шақыруына 4 музыка ұсыны JSON форматында:

ТІКЕЛЕЙ JSON:
{"suggestions":[
  {"title":"Ән атауы","artist":"Орындаушы","style":"Стиль (Romantic Piano / Домбыра / Pop)","mood":"Атмосфера","youtubeQuery":"YouTube іздеу сөздері"},
  ...
]}

Нақты, нағыз ән атауларын ұсын. Стилді ${eventType} іс-шарасына сай таңда.`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 700);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, "suggest_music_list", result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as { suggestions?: MusicSuggestion[] };
    return { suggestions: parsed.suggestions?.slice(0, 4), inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch { return { error: "Музыка ұсынымын жасау қатесі" }; }
}

// ── Smart Color Generator ─────────────────────────────────────────────

export async function generateColorPalette(context: InviteContext): Promise<{
  palette?: ColorPalette;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const info = [
    context.templateName,
    context.eventType,
    context.accentColor && `бар акцент: ${context.accentColor}`,
  ].filter(Boolean).join(", ");

  const prompt = `${info ? `(${info}) ` : ""}шақыруға сәйкес premium түс палитрасын JSON форматында жаса.

ТІКЕЛЕЙ JSON:
{"name":"Палитра атауы","mood":"Атмосфера","primary":"#hex","accent":"#hex","background":"#hex"}

Ережелер:
- background: өте ашық (ақ, кремдік, нәзік)
- primary: орта тон (негізгі элементтер үшін)
- accent: жарқын немесе байыпты (батырмалар, акценттер үшін)
- Барлық hex кодтар дәл 7 символ: # + 6 сан/әріп`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 400);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, "generate_colors", result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as ColorPalette;
    if (!HEX_RE.test(parsed.primary ?? "") || !HEX_RE.test(parsed.accent ?? "") || !HEX_RE.test(parsed.background ?? "")) {
      return { error: "Hex кодтар дұрыс емес. Қайталаңыз." };
    }
    return { palette: parsed, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch { return { error: "Түс палитрасын жасау қатесі" }; }
}

// ── AI Image Prompt Generator ─────────────────────────────────────────

export async function generateImagePrompts(context: InviteContext): Promise<{
  prompts?: ImagePrompts;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const style = context.templateName ?? "luxury wedding";
  const accent = context.accentColor ?? "gold";
  const names = [context.groomName, context.brideName].filter(Boolean).join(" and ") || "couple";

  const prompt = `Generate 3 professional image generation prompts in English for a "${style}" wedding invitation. Names: ${names}.

RESPOND WITH ONLY JSON:
{"cover":"...","gallery":"...","background":"..."}

Rules:
- cover: 12-18 words, wedding imagery for the main invitation cover photo
- gallery: 12-18 words, romantic couple/venue photo style
- background: 10-15 words, abstract decorative texture/pattern for page background
- Use specific visual elements: flowers, fabric, ${accent} tones, lighting
- Style: cinematic, professional, high-end editorial`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 500);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, "image_prompts", result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as ImagePrompts;
    if (!parsed.cover || !parsed.gallery || !parsed.background) return { error: "Промпт жасау қатесі" };
    return { prompts: parsed, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch { return { error: "Промпт жасау қатесі" }; }
}

// ── AI Text Generator (structured, 6 modes) ──────────────────────────

export interface InviteTextsResult {
  title?: string;
  body?: string;
  program?: string;
  rsvp?: string;
  wishes?: string;
  error?: string;
}

export async function generateInviteTexts(
  context: InviteContext,
  mode: string,
  lang: string
): Promise<InviteTextsResult> {
  const session = await getSession();
  if (!session) return { error: "Жүйеге кіруіңіз қажет" };

  const names = [context.groomName, context.brideName].filter(Boolean).join(" & ") || "Той иелері";
  const eventInfo = [
    context.date && `күні: ${context.date}`,
    context.location && `орны: ${context.location}`,
  ].filter(Boolean).join(", ");

  const modeDesc: Record<string, string> = {
    romantic: "романтикалық, жылы, поэтикалық",
    kazakh: "дәстүрлі қазақ мәдениетіне сай, ресми",
    modern: "заманауи, жеңіл, энергиялы",
    luxury: "люкс, элегантты, ірі іс-шара стилі",
    minimal: "минималист, нақты, қысқа",
    funny: "юмормен, жеңіл, күлдіргі",
  };

  const langInstruction = lang === "ru"
    ? "Мәтіндерді орысша жаз."
    : lang === "en"
    ? "Write all texts in English."
    : "Мәтіндерді қазақша жаз.";

  const prompt = `${names} шақыруына ${modeDesc[mode] ?? "романтикалық"} стильде барлық мәтіндерді жаса.${eventInfo ? ` (${eventInfo})` : ""} ${langInstruction}

ТІКЕЛЕЙ JSON:
{
  "title": "Шақыру атауы (5-8 сөз)",
  "body": "Шақыру мәтіні (50-100 сөз, жылы, жеке стиль)",
  "program": "Бағдарлама мәтіні (2-3 тармақ, уақыт + іс-шара)",
  "rsvp": "RSVP хабарламасы (20-30 сөз)",
  "wishes": "Тілектер бетінің хабарламасы (20-30 сөз)"
}`;

  const result = await callAnthropic(buildSystemPrompt(context), [{ role: "user", content: prompt }], 1200);
  if ("error" in result) return { error: result.error };

  void trackUsage(session.userId, `text_${mode}`, result.inputTokens, result.outputTokens);

  try {
    const parsed = extractJSON(result.text) as InviteTextsResult;
    return {
      title: parsed.title,
      body: parsed.body,
      program: parsed.program,
      rsvp: parsed.rsvp,
      wishes: parsed.wishes,
    };
  } catch { return { error: "AI жауабын талдау қатесі. Қайталаңыз." }; }
}

// ── Backward compat ───────────────────────────────────────────────────

export async function askAI(message: string, context: InviteContext, type: GenerationType = "chat"): Promise<AIResult> {
  return askAIWithMemory(message, context, type);
}
