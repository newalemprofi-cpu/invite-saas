"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;
type Lang = "kk" | "ru";

interface EventOpt {
  label: string;
  cat: string;
  emoji: string;
}

const EVENTS: EventOpt[] = [
  { label: "Үйлену той",  cat: "wedding",   emoji: "💍" },
  { label: "Қыз ұзату",  cat: "uzatu",     emoji: "🌸" },
  { label: "Тұсаукесер", cat: "birthday",  emoji: "👶" },
  { label: "Бесік той",  cat: "kazakh",    emoji: "🍼" },
  { label: "Туған күн",  cat: "birthday",  emoji: "🎂" },
  { label: "Сүндет той", cat: "kazakh",    emoji: "⭐" },
  { label: "Құдалық",    cat: "kazakh",    emoji: "🤝" },
  { label: "Корпоратив", cat: "corporate", emoji: "🏢" },
];

export function OnboardingQuiz({ adminPhone }: { adminPhone: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [visible, setVisible] = useState(true);
  const [lang, setLang] = useState<Lang>("kk");
  const [event, setEvent] = useState<EventOpt | null>(null);

  function go(fn: () => void) {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, 180);
  }

  const progress = (step / 3) * 100;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#FAF8F3" }}
    >
      {/* Warm background glows */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "60vw", height: "60vw", maxWidth: 420, maxHeight: 420,
          background: "radial-gradient(ellipse at top right, rgba(196,150,62,0.10) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{
          width: "50vw", height: "50vw", maxWidth: 340, maxHeight: 340,
          background: "radial-gradient(ellipse at bottom left, rgba(196,150,62,0.07) 0%, transparent 65%)",
        }}
      />
      {/* Decorative corner accents */}
      <span className="absolute top-5 right-5 text-2xl pointer-events-none select-none" style={{ opacity: 0.12 }}>🌿</span>
      <span className="absolute bottom-10 left-5 text-xl pointer-events-none select-none" style={{ opacity: 0.09 }}>🌿</span>

      {/* ── Header ──────────────────────────────────── */}
      <header className="relative z-10 shrink-0 px-5 sm:px-8 pt-5">
        <div className="max-w-[420px] mx-auto">
          <div className="flex items-center justify-between mb-4">

            {/* Brand */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm" style={{ color: "var(--gold)" }}>✦</span>
                <span
                  className="font-semibold text-[18px] tracking-tight"
                  style={{ color: "var(--charcoal)" }}
                >
                  Shaqyru
                </span>
              </div>
              <p
                className="text-[9px] uppercase ml-5"
                style={{ color: "var(--muted)", letterSpacing: "0.18em" }}
              >
                online invitations
              </p>
            </div>

            {/* Step pill indicators */}
            <div className="flex items-center gap-[5px]">
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  className="rounded-full"
                  style={{
                    height: 6,
                    width: s === step ? 20 : 6,
                    background:
                      s < step
                        ? "var(--gold-dark)"
                        : s === step
                        ? "var(--gold)"
                        : "var(--border)",
                    transition: "width 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="h-[2px] rounded-full overflow-hidden"
            style={{ background: "rgba(196,150,62,0.15)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #9A7B2F, #C4963E)",
                width: `${progress}%`,
                transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Quiz ────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 py-6 overflow-y-auto">
        <div
          className="w-full max-w-[420px]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.18s ease, transform 0.18s ease",
          }}
        >

          {/* ─ Step 1: Language ─────────────────────── */}
          {step === 1 && (
            <div>
              <StepLabel text="Тіл · 1/3" />
              <Question>Қай тілде шақыру<br />жасаймыз?</Question>
              <Divider />
              <div className="grid grid-cols-2 gap-3 mt-7">
                <LangCard
                  flag="🇰🇿"
                  label="Қазақша"
                  sub="Казахский"
                  onClick={() => go(() => { setLang("kk"); setStep(2); })}
                />
                <LangCard
                  flag="🇷🇺"
                  label="Русский"
                  sub="Russian"
                  onClick={() => go(() => { setLang("ru"); setStep(2); })}
                />
              </div>
            </div>
          )}

          {/* ─ Step 2: Event type ───────────────────── */}
          {step === 2 && (
            <div>
              <BackBtn onClick={() => go(() => setStep(1))} />
              <StepLabel text="Мереке · 2/3" />
              <Question>Қандай мерекеге<br />шақыру керек?</Question>
              <Divider />
              <div className="grid grid-cols-2 gap-2.5 mt-6">
                {EVENTS.map((e) => (
                  <EventCard
                    key={e.label}
                    emoji={e.emoji}
                    label={e.label}
                    onClick={() => go(() => { setEvent(e); setStep(3); })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─ Step 3: Method ───────────────────────── */}
          {step === 3 && (
            <div>
              <BackBtn onClick={() => go(() => setStep(2))} />
              <StepLabel text="Жол · 3/3" />
              <Question>Қалай<br />жалғастырамыз?</Question>
              <Divider />
              <div className="flex flex-col gap-3 mt-7">
                <MethodCard
                  icon="✨"
                  label="Өзім жасаймын"
                  desc="Шаблондар мен редактор арқылы"
                  primary
                  onClick={() =>
                    router.push(`/templates?cat=${event?.cat ?? "wedding"}&lang=${lang}`)
                  }
                />
                <MethodCard
                  icon="💬"
                  label="WhatsApp арқылы заказ беремін"
                  desc="Менеджер сізге хабарласады"
                  onClick={() => {
                    const langLabel = lang === "kk" ? "Қазақша" : "Русский";
                    const ev = event?.label ?? "Үйлену той";
                    const text = `Сәлем! Онлайн шақыру жасатқым келеді. Тіл: ${langLabel}. Мереке: ${ev}.`;
                    const phone = adminPhone.replace(/\D/g, "");
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Shared inline primitives ────────────────────── */

function StepLabel({ text }: { text: string }) {
  return (
    <p
      className="font-medium mb-3"
      style={{
        fontSize: "11px",
        color: "var(--gold)",
        letterSpacing: "0.13em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </p>
  );
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="font-semibold leading-snug"
      style={{
        fontSize: "clamp(1.3rem, 5vw, 1.6rem)",
        color: "var(--charcoal)",
        lineHeight: 1.3,
      }}
    >
      {children}
    </h1>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-2 mt-3.5">
      <div className="h-px flex-1" style={{ background: "rgba(196,150,62,0.18)" }} />
      <span style={{ color: "rgba(196,150,62,0.45)", fontSize: 10 }}>✦</span>
      <div className="h-px flex-1" style={{ background: "rgba(196,150,62,0.18)" }} />
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium mb-6"
      style={{ color: "var(--muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--charcoal)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
    >
      ← <span>Артқа</span>
    </button>
  );
}

/* ── Card variants ───────────────────────────────── */

function LangCard({
  flag, label, sub, onClick,
}: {
  flag: string; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2.5 rounded-3xl active:scale-[0.96] w-full"
      style={{
        background: "white",
        border: "1.5px solid #E8E2D9",
        boxShadow: "0 2px 14px rgba(28,25,23,0.05)",
        padding: "28px 16px",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C4963E";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(196,150,62,0.12), 0 4px 18px rgba(28,25,23,0.07)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E8E2D9";
        e.currentTarget.style.boxShadow = "0 2px 14px rgba(28,25,23,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span className="text-[42px] leading-none">{flag}</span>
      <div className="text-center">
        <p className="font-semibold text-[15px]" style={{ color: "var(--charcoal)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>
      </div>
    </button>
  );
}

function EventCard({
  emoji, label, onClick,
}: {
  emoji: string; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-[0.95] w-full"
      style={{
        background: "white",
        border: "1.5px solid #E8E2D9",
        boxShadow: "0 1px 8px rgba(28,25,23,0.04)",
        padding: "14px 8px",
        minHeight: 76,
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C4963E";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(196,150,62,0.10), 0 4px 12px rgba(28,25,23,0.05)";
        e.currentTarget.style.background = "rgba(196,150,62,0.025)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E8E2D9";
        e.currentTarget.style.boxShadow = "0 1px 8px rgba(28,25,23,0.04)";
        e.currentTarget.style.background = "white";
      }}
    >
      <span className="text-[26px] leading-none">{emoji}</span>
      <p
        className="font-medium text-[12px] text-center leading-snug"
        style={{ color: "var(--charcoal)" }}
      >
        {label}
      </p>
    </button>
  );
}

function MethodCard({
  icon, label, desc, primary = false, onClick,
}: {
  icon: string; label: string; desc: string; primary?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 px-5 py-[18px] rounded-2xl text-left w-full active:scale-[0.98]"
      style={
        primary
          ? {
              background: "linear-gradient(135deg, #1C1917 0%, #2D2520 100%)",
              boxShadow: "0 6px 24px rgba(28,25,23,0.18)",
              color: "white",
              transition: "box-shadow 0.15s, transform 0.12s",
            }
          : {
              background: "white",
              border: "1.5px solid #E8E2D9",
              color: "var(--charcoal)",
              boxShadow: "0 2px 12px rgba(28,25,23,0.05)",
              transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
            }
      }
      onMouseEnter={(e) => {
        if (primary) {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(28,25,23,0.26)";
          e.currentTarget.style.transform = "translateY(-1px)";
        } else {
          e.currentTarget.style.borderColor = "#C4963E";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(196,150,62,0.10), 0 4px 16px rgba(28,25,23,0.06)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (primary) {
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(28,25,23,0.18)";
          e.currentTarget.style.transform = "translateY(0)";
        } else {
          e.currentTarget.style.borderColor = "#E8E2D9";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(28,25,23,0.05)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Icon bubble */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{
          background: primary ? "rgba(196,150,62,0.16)" : "rgba(196,150,62,0.09)",
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold leading-snug"
          style={{ fontSize: "14.5px" }}
        >
          {label}
        </p>
        <p
          className="text-[12px] mt-0.5 leading-snug"
          style={{ color: primary ? "rgba(255,255,255,0.42)" : "var(--muted)" }}
        >
          {desc}
        </p>
      </div>

      {/* Arrow */}
      <span
        className="shrink-0 text-base"
        style={{ color: primary ? "rgba(196,150,62,0.7)" : "rgba(196,150,62,0.35)" }}
      >
        →
      </span>
    </button>
  );
}
