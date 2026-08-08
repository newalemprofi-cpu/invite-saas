"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import {
  askAIWithMemory,
  getOrCreateConversation,
  generateFullInvite,
  recommendTemplates,
  suggestMusicForInvite,
  generateColorPalette,
  generateImagePrompts,
  type InviteContext,
  type GenerationType,
  type FullGenerationResult,
  type TemplateRecommendation,
  type MusicSuggestion,
  type ColorPalette,
  type ImagePrompts,
} from "@/app/actions/ai";

// ── Types ──────────────────────────────────────────────────────────────

type RichKind = "template_cards" | "music_cards" | "color_palette" | "image_prompts";
type RichData = TemplateRecommendation[] | MusicSuggestion[] | ColorPalette | ImagePrompts;

interface Message {
  role: "user" | "assistant";
  text: string;
  isText?: boolean;
  richKind?: RichKind;
  richData?: RichData;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

// ── Quick actions config ───────────────────────────────────────────────

type TextAction = { kind: "text"; emoji: string; label: string; genType: GenerationType };
type RichAction = { kind: "rich"; emoji: string; label: string; richKind: RichKind };
type QuickAction = TextAction | RichAction;

const QUICK_ACTIONS: QuickAction[] = [
  { kind: "text", emoji: "❤️", label: "Романтикалық", genType: "romantic" },
  { kind: "text", emoji: "🇰🇿", label: "Қазақша", genType: "kazakh" },
  { kind: "text", emoji: "✨", label: "Заманауи", genType: "modern" },
  { kind: "rich", emoji: "🎵", label: "Музыка ұсын", richKind: "music_cards" },
  { kind: "rich", emoji: "🎨", label: "Түс палитра", richKind: "color_palette" },
  { kind: "rich", emoji: "🎭", label: "Шаблон ұсын", richKind: "template_cards" },
  { kind: "rich", emoji: "📷", label: "Сурет промпт", richKind: "image_prompts" },
  { kind: "text", emoji: "🧠", label: "Редактор", genType: "explain_editor" },
  { kind: "text", emoji: "💌", label: "RSVP хаты", genType: "rsvp" },
];

// ── Props ─────────────────────────────────────────────────────────────

interface Props {
  context?: InviteContext;
  inviteId?: string;
  onApplyText?: (text: string) => void;
  onApplyTemplate?: (slug: string) => void;
  onApplyMusic?: (title: string) => void;
  onApplyColors?: (bgColor: string, accentColor: string) => void;
  onFullGenerate?: (result: FullGenerationResult) => void;
}

// ── Component ─────────────────────────────────────────────────────────

export function AIAssistant({
  context = {}, inviteId,
  onApplyText, onApplyTemplate, onApplyMusic, onApplyColors, onFullGenerate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [configured, setConfigured] = useState(true);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [convLoaded, setConvLoaded] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFullGenerating, setIsFullGenerating] = useState(false);
  const [isRichLoading, setIsRichLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // ── Load conversation ─────────────────────────────────────────────

  function setWelcome() {
    const names = [context.groomName, context.brideName].filter(Boolean).join(" & ");
    setMessages([{
      role: "assistant",
      text: names
        ? `Сәлем! ${names} шақыруы бойынша дайынмын.\n\n«✨ AI толық толтырсын» барлығын автоматты жасайды. Немесе төмендегі кез-келген батырманы басыңыз.`
        : "Сәлем! Шақыру мәтіні, дизайн, музыка, шаблон — кез-келгенін жасауға дайынмын.",
    }]);
  }

  useEffect(() => {
    if (!open || !inviteId || convLoaded || convLoading) return;
    setConvLoading(true);
    getOrCreateConversation(inviteId).then((data) => {
      setConvLoading(false);
      setConvLoaded(true);
      if (!data) { setWelcome(); return; }
      setConversationId(data.conversationId);
      if (data.messages.length > 0) {
        setMessages(data.messages.map((m) => ({ role: m.role as "user" | "assistant", text: m.content, isText: m.isText })));
      } else {
        setWelcome();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inviteId]);

  useEffect(() => {
    if (open && !inviteId && messages.length === 0) setWelcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inviteId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Helpers ───────────────────────────────────────────────────────

  const addTokens = (i = 0, o = 0) => setSessionTokens((t) => t + i + o);

  const handleError = (err: string) => {
    if (err === "AI_NOT_CONFIGURED") {
      setConfigured(false);
      setMessages((p) => [...p, { role: "assistant", text: "⚙️ AI белсендірілмеген. ANTHROPIC_API_KEY орнатылмаған." }]);
    } else {
      setMessages((p) => [...p, { role: "assistant", text: `❌ ${err}` }]);
    }
  };

  // ── Text chat ─────────────────────────────────────────────────────

  const send = useCallback((msg: string, genType: GenerationType = "chat") => {
    if ((!msg.trim() && genType === "chat") || isPending) return;
    const action = QUICK_ACTIONS.find((a) => a.kind === "text" && a.genType === genType);
    const displayText = genType !== "chat" && action ? `${action.emoji} ${action.label}` : msg;
    setMessages((p) => [...p, { role: "user", text: displayText }]);
    setInput("");

    startTransition(async () => {
      const result = await askAIWithMemory(genType === "chat" ? msg : "", context, genType, conversationId);
      if (result.error) { handleError(result.error); return; }
      addTokens(result.inputTokens, result.outputTokens);
      setMessages((p) => [...p, { role: "assistant", text: result.text ?? "", isText: result.isText }]);
    });
  }, [isPending, context, conversationId]); // eslint-disable-line

  // ── Rich actions ──────────────────────────────────────────────────

  const sendRich = useCallback(async (richKind: RichKind) => {
    if (isRichLoading || isPending) return;
    const action = QUICK_ACTIONS.find((a) => a.kind === "rich" && a.richKind === richKind);
    if (!action) return;
    setMessages((p) => [...p, { role: "user", text: `${action.emoji} ${action.label}` }]);
    setIsRichLoading(true);

    try {
      if (richKind === "template_cards") {
        const res = await recommendTemplates(context);
        if (res.error) { handleError(res.error); return; }
        addTokens(res.inputTokens, res.outputTokens);
        setMessages((p) => [...p, {
          role: "assistant", text: "Сізге мыналар сай келеді:",
          richKind: "template_cards", richData: res.recommendations,
        }]);

      } else if (richKind === "music_cards") {
        const res = await suggestMusicForInvite(context);
        if (res.error) { handleError(res.error); return; }
        addTokens(res.inputTokens, res.outputTokens);
        setMessages((p) => [...p, {
          role: "assistant", text: "Осы шақыруға сәйкес музыка:",
          richKind: "music_cards", richData: res.suggestions,
        }]);

      } else if (richKind === "color_palette") {
        const res = await generateColorPalette(context);
        if (res.error) { handleError(res.error); return; }
        addTokens(res.inputTokens, res.outputTokens);
        setMessages((p) => [...p, {
          role: "assistant", text: "Ұсынылатын түс палитрасы:",
          richKind: "color_palette", richData: res.palette,
        }]);

      } else if (richKind === "image_prompts") {
        const res = await generateImagePrompts(context);
        if (res.error) { handleError(res.error); return; }
        addTokens(res.inputTokens, res.outputTokens);
        setMessages((p) => [...p, {
          role: "assistant", text: "Сурет жасауға арналған промптар (OpenAI / Midjourney):",
          richKind: "image_prompts", richData: res.prompts,
        }]);
      }
    } finally {
      setIsRichLoading(false);
    }
  }, [isRichLoading, isPending, context]); // eslint-disable-line

  // ── Full generate ─────────────────────────────────────────────────

  const runFullGenerate = useCallback(async () => {
    if (!inviteId || isFullGenerating || !onFullGenerate) return;
    setIsFullGenerating(true);
    setMessages((p) => [...p, { role: "user", text: "✨ AI толық толтырсын" }]);

    const result = await generateFullInvite(inviteId, context);
    setIsFullGenerating(false);

    if (result.error) { handleError(result.error); return; }

    addTokens(result.inputTokens, result.outputTokens);
    onFullGenerate(result);

    const applied: string[] = [];
    if (result.invitationText) applied.push("✅ Шақыру мәтіні");
    if (result.bgColor || result.accentColor) applied.push(`✅ Түс: фон ${result.bgColor ?? "—"} · акцент ${result.accentColor ?? "—"}`);
    if (result.fontFamily) applied.push(`✅ Қаріп: ${result.fontFamily}`);
    if (result.musicTitle) applied.push(`✅ Музыка: ${result.musicTitle}`);

    let summary = `Шақыру автоматты толтырылды:\n${applied.join("\n")}`;
    if (result.timeline?.length) {
      summary += `\n\n📋 Ұсынылатын бағдарлама:\n${result.timeline.map((t) => `${t.time} — ${t.title}`).join("\n")}`;
    }
    setMessages((p) => [...p, { role: "assistant", text: summary }]);
  }, [inviteId, isFullGenerating, onFullGenerate, context]); // eslint-disable-line

  // ── Voice ─────────────────────────────────────────────────────────

  const startVoice = useCallback(() => {
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecClass = (win["SpeechRecognition"] ?? win["webkitSpeechRecognition"]) as
      | (new () => SpeechRecognitionLike) | undefined;

    if (!SpeechRecClass) {
      setMessages((p) => [...p, { role: "assistant", text: "⚠️ Браузер дауыс енгізуді қолдамайды. Chrome/Edge қолданыңыз." }]);
      return;
    }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); return; }

    const rec = new SpeechRecClass();
    rec.lang = "kk-KZ";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [isListening]);

  // ── Copy helper ───────────────────────────────────────────────────

  const copyText = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  // ── State ─────────────────────────────────────────────────────────

  const isBusy = isPending || isFullGenerating || isRichLoading;
  const hasContext = !!(context.groomName || context.brideName || context.date || context.templateName);

  // ── Render rich content ───────────────────────────────────────────

  function renderRich(m: Message) {
    if (!m.richKind || !m.richData) return null;

    if (m.richKind === "template_cards") {
      const recs = m.richData as TemplateRecommendation[];
      return (
        <div className="flex flex-col gap-2 w-full">
          {recs.map((rec) => (
            <div key={rec.slug} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: rec.bg }}>
              <div className={`h-14 bg-gradient-to-br ${rec.gradient} flex items-center justify-center gap-2`}>
                <span className="text-2xl">{rec.emoji}</span>
                <p className="text-sm font-semibold" style={{ color: rec.textDark }}>{rec.name}</p>
                {rec.isPremium && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(196,150,62,0.2)", color: rec.textDark }}>PRO</span>}
              </div>
              <div className="p-2.5">
                <p className="text-[11px] leading-snug mb-2" style={{ color: rec.textMuted }}>{rec.reason}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: rec.accent }}>{rec.price.toLocaleString("kk-KZ")} ₸</span>
                  {onApplyTemplate && (
                    <button
                      onClick={() => onApplyTemplate(rec.slug)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: rec.accent, color: "white" }}
                    >
                      Қолдану →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (m.richKind === "music_cards") {
      const songs = m.richData as MusicSuggestion[];
      return (
        <div className="flex flex-col gap-2 w-full">
          {songs.map((song, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
              <span className="text-lg shrink-0">🎵</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--charcoal)" }}>{song.title}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{song.artist} · {song.style}</p>
                <p className="text-[10px]" style={{ color: "var(--gold-dark)" }}>{song.mood}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {onApplyMusic && (
                  <button
                    onClick={() => onApplyMusic(`${song.title} — ${song.artist}`)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap"
                    style={{ background: "var(--charcoal)", color: "white" }}
                  >
                    🎵 Қолдану
                  </button>
                )}
                <button
                  onClick={() => copyText(song.youtubeQuery, `yt-${i}`)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap"
                  style={{ background: "var(--cream)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {copiedKey === `yt-${i}` ? "✓ Көшірілді" : "📋 YouTube"}
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (m.richKind === "color_palette") {
      const pal = m.richData as ColorPalette;
      return (
        <div className="w-full rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* Swatches */}
          <div className="flex h-16">
            <div className="flex-1" style={{ background: pal.background }} title={`Фон: ${pal.background}`} />
            <div className="flex-1" style={{ background: pal.primary }} title={`Негізгі: ${pal.primary}`} />
            <div className="flex-1" style={{ background: pal.accent }} title={`Акцент: ${pal.accent}`} />
          </div>
          <div className="p-3" style={{ background: "white" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--charcoal)" }}>{pal.name}</p>
            <p className="text-[10px] mb-2" style={{ color: "var(--muted)" }}>{pal.mood}</p>
            <div className="flex gap-3 text-[10px] font-mono mb-3" style={{ color: "var(--muted)" }}>
              <span>BG <span style={{ color: pal.background }}>■</span> {pal.background}</span>
              <span>· <span style={{ color: pal.primary }}>■</span> {pal.primary}</span>
              <span>· <span style={{ color: pal.accent }}>■</span> {pal.accent}</span>
            </div>
            {onApplyColors && (
              <button
                onClick={() => onApplyColors(pal.background, pal.accent)}
                className="w-full py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: pal.accent, color: "white" }}
              >
                🎨 Палитраны қолдану
              </button>
            )}
          </div>
        </div>
      );
    }

    if (m.richKind === "image_prompts") {
      const prompts = m.richData as ImagePrompts;
      const items: Array<{ key: keyof ImagePrompts; label: string; emoji: string }> = [
        { key: "cover", label: "Мұқаба суреті", emoji: "🖼️" },
        { key: "gallery", label: "Галерея суреті", emoji: "📸" },
        { key: "background", label: "Шақыру фоны", emoji: "🎨" },
      ];
      return (
        <div className="flex flex-col gap-2 w-full">
          {items.map(({ key, label, emoji }) => (
            <div key={key} className="p-3 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold" style={{ color: "var(--gold-dark)" }}>{emoji} {label}</p>
                <button
                  onClick={() => copyText(prompts[key], key)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: copiedKey === key ? "#dcfce7" : "var(--cream)", color: copiedKey === key ? "#16a34a" : "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {copiedKey === key ? "✓ Көшірілді" : "📋 Көшіру"}
                </button>
              </div>
              <p className="text-[11px] leading-snug italic" style={{ color: "var(--charcoal)" }}>&ldquo;{prompts[key]}&rdquo;</p>
            </div>
          ))}
          <p className="text-[10px] text-center" style={{ color: "var(--muted)" }}>
            OpenAI DALL-E · Midjourney · Stable Diffusion үшін дайын
          </p>
        </div>
      );
    }
    return null;
  }

  // ── JSX ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
        style={{ background: "var(--charcoal)", color: "#FAF8F3", boxShadow: "0 8px 32px rgba(28,25,23,0.35)" }}
        aria-label="AI Агент"
      >
        <span>{open ? "✕" : "✨"}</span>
        {!open && <span>AI Агент</span>}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[340px] sm:w-[400px] flex flex-col rounded-3xl overflow-hidden"
          style={{ height: 660, background: "white", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}
        >
          {/* Header */}
          <div className="px-5 py-3 shrink-0" style={{ background: "var(--charcoal)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm" style={{ color: "#FAF8F3" }}>✨ AI Агент</p>
                <p className="text-[10px]" style={{ color: "#6E6560" }}>Контекстті есте сақтайды · Дауыспен жазады</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#9A8F8A" }}>✕</button>
            </div>
            {hasContext && (
              <div className="flex flex-wrap gap-1.5">
                {(context.groomName || context.brideName) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(196,150,62,0.2)", color: "#E8C97A" }}>
                    👤 {[context.groomName, context.brideName].filter(Boolean).join(" & ")}
                  </span>
                )}
                {context.date && (
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(196,150,62,0.2)", color: "#E8C97A" }}>📅 {context.date}</span>
                )}
                {context.templateName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(196,150,62,0.2)", color: "#E8C97A" }}>🎨 {context.templateName}</span>
                )}
              </div>
            )}
          </div>

          {/* Full generate CTA */}
          {onFullGenerate && (
            <div className="px-3 py-2 shrink-0" style={{ background: "linear-gradient(135deg, #1C1917 0%, #2D2520 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={runFullGenerate}
                disabled={isBusy || !configured}
                className="w-full py-2 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #C4963E 0%, #E8C97A 100%)", color: "#1C1917" }}
              >
                {isFullGenerating ? <><span className="animate-spin inline-block">⟳</span> Жасалуда...</> : <>✨ AI толық толтырсын</>}
              </button>
              <p className="text-[10px] text-center mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Мәтін · Дизайн · Музыка · Бағдарлама
              </p>
            </div>
          )}

          {/* Quick actions 3×3 */}
          <div className="px-3 py-2 grid grid-cols-3 gap-1.5 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--cream)" }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.kind === "text" ? a.genType : a.richKind}
                onClick={() => a.kind === "text" ? send("", a.genType) : sendRich(a.richKind)}
                disabled={isBusy || !configured}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:scale-[1.02] disabled:opacity-40"
                style={{ background: "white", border: "1px solid var(--border)", color: "var(--charcoal)" }}
              >
                <span>{a.emoji}</span>
                <span className="leading-tight">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {convLoading && (
              <div className="flex justify-center py-3">
                <span className="text-xs animate-pulse" style={{ color: "var(--muted)" }}>Сөйлесу жүктелуде...</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-1.5`}>
                <div
                  className="max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={m.role === "user"
                    ? { background: "var(--charcoal)", color: "#FAF8F3", borderBottomRightRadius: 4 }
                    : { background: "var(--cream)", color: "var(--charcoal)", borderBottomLeftRadius: 4 }}
                >
                  {m.text}
                </div>
                {/* Rich card */}
                {m.role === "assistant" && m.richKind && (
                  <div className="w-full max-w-[90%]">{renderRich(m)}</div>
                )}
                {/* Apply text button */}
                {m.role === "assistant" && m.isText && onApplyText && (
                  <button
                    onClick={() => onApplyText(m.text)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)", border: "1px solid rgba(196,150,62,0.25)" }}
                  >
                    ✍️ Редакторға қолдану
                  </button>
                )}
              </div>
            ))}
            {isBusy && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl text-sm" style={{ background: "var(--cream)", color: "var(--muted)" }}>
                  <span className="animate-pulse">●●●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex gap-1.5 pt-3">
              <input
                className="flex-1 input-premium text-sm py-2 px-3"
                placeholder="Сұрақ жазыңыз..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
                disabled={isBusy}
              />
              <button
                onClick={startVoice}
                disabled={isBusy}
                title={isListening ? "Тоқтату" : "Дауыспен жазу (kk-KZ)"}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all"
                style={{
                  background: isListening ? "#ef4444" : "var(--cream)",
                  color: isListening ? "white" : "var(--charcoal)",
                  border: `1px solid ${isListening ? "#ef4444" : "var(--border)"}`,
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                {isListening ? "⏹" : "🎙"}
              </button>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isBusy}
                className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center transition-all"
                style={{ background: "var(--charcoal)", opacity: !input.trim() || isBusy ? 0.4 : 1 }}
              >→</button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                {sessionTokens > 0 ? `${sessionTokens.toLocaleString()} токен` : ""}
              </p>
              {conversationId && (
                <p className="text-[10px]" style={{ color: "var(--muted)" }}>💾 Сақталды</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
