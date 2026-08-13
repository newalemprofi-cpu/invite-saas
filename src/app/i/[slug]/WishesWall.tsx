"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Wish } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { submitWish } from "@/app/actions/wishes";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SwipeTrack } from "@/components/invitation/SwipeTrack";

const schema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  message: z.string().min(1, "Тілегіңізді жазыңыз").max(500),
});
type FormData = z.infer<typeof schema>;

interface Props {
  /** Required for a real submission; never read when `demo` is true. */
  inviteId?: string;
  /** Required for the real (non-demo) path; never read when `demo` is true. */
  wishes?: Wish[];
  accent: string;
  cardBg: string;
  cardBorder: string;
  sectionDivider?: string;
  /**
   * true only for the template full-preview demo (/templates/[slug]) — the
   * section shows original, clearly-generic sample wishes (never invented
   * to resemble a real guest) plus the exact same fully-interactive
   * submission form, but submitting never calls submitWish and never
   * persists anything: it locally prepends the entered wish to the
   * in-memory sample list, exactly like a real submission would look,
   * with nothing ever reaching the database. Real `/i/[slug]` never
   * passes this.
   */
  demo?: boolean;
  /** Governs only the genuinely NEW strings this mode introduces (the
   * sample wishes + section framing) — the submission form's own field
   * labels/button stay in the project's existing hardcoded-Kazakh
   * convention either way, matching RSVPForm's identical precedent.
   * Defaults "kk". */
  lang?: Lang;
}

const SECTION_TEXT: Record<Lang, { kicker: string; heading: string; navPrev: string; navNext: string; wishCaption: string }> = {
  kk: { kicker: "Тілектер", heading: "Тілек қалдырыңыз", navPrev: "Алдыңғы тілек", navNext: "Келесі тілек", wishCaption: "тілегі:" },
  ru: { kicker: "Пожелания", heading: "Оставить пожелание", navPrev: "Предыдущее пожелание", navNext: "Следующее пожелание", wishCaption: "пожелание:" },
};

/** Original, deliberately generic sample content for the demo carousel —
 * never copied from any reference design, never resembling a real guest. */
const SAMPLE_WISHES: Record<Lang, { name: string; message: string }[]> = {
  kk: [
    { name: "Айгерім", message: "Қуанышты да шынайы бақытты өмір тілеймін! Отбасыларыңызға зор денсаулық пен молшылық болсын." },
    { name: "Данияр", message: "Ғажайып жұп! Махаббат пен түсіністік әрдайым жаныңызда болсын." },
  ],
  ru: [
    { name: "Айгерим", message: "Желаю искренего счастья и благополучия! Пусть в вашем доме всегда будет любовь и тепло." },
    { name: "Данияр", message: "Прекрасная пара! Пусть любовь и понимание всегда будут с вами." },
  ],
};

const MONTHS_KK = [
  "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
  "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
];

/**
 * Deliberately NOT `toLocaleDateString("kk-KZ", ...)` — that produced a
 * genuine SSR/hydration text mismatch here (confirmed by isolating it: the
 * exact same locale call already used elsewhere in this file tree for the
 * EVENT date, e.g. WeddingHero.tsx's fmtDate, builds the Date from plain
 * Y/M/D integers with no time-of-day component, while a Wish's createdAt
 * carries a full timestamp reconstructed from the RSC wire on the client —
 * evidently enough for the two environments' ICU formatting to disagree).
 * Plain numeric `.getDate()/.getMonth()` extraction plus a fixed Kazakh
 * month-name table sidesteps Intl entirely, so server and client always
 * render byte-identical text regardless of ICU/locale-data differences.
 */
function fmtWishDate(d: Date): string {
  try {
    const date = new Date(d);
    return `${date.getDate()} ${MONTHS_KK[date.getMonth()]}`;
  } catch {
    return "";
  }
}

/** Fixed calendar dates (never "now"-derived) so the demo sample wishes
 * render byte-identical on server and client — the exact same hydration
 * pitfall fmtWishDate's own doc comment above already root-caused once for
 * real wish dates; a `new Date()`/`Date.now()`-based sample date would
 * reintroduce it. */
const SAMPLE_WISH_DATES = [new Date(2026, 6, 16), new Date(2026, 6, 10)];

/**
 * Guest-facing wishes wall — the WISHES paid add-on (§15/§18). A genuinely
 * new, persisted feature (Prisma `Wish` model, additive migration), NOT to
 * be confused with the pre-existing static `wishesText` block rendered
 * right above this in page.tsx (the couple's own message TO guests).
 */
export function WishesWall({ inviteId, wishes, accent, cardBg, cardBorder, sectionDivider, demo = false, lang = "kk" }: Props) {
  const t = SECTION_TEXT[lang];
  const [list, setList] = useState<Wish[]>(() =>
    demo
      ? SAMPLE_WISHES[lang].map((w, i) => ({
          id: `sample-${i}`,
          inviteId: "demo",
          name: w.name,
          message: w.message,
          createdAt: SAMPLE_WISH_DATES[i] ?? new Date(2026, 0, 1),
        }))
      : (wishes ?? [])
  );
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    if (demo) {
      // Local-only — no network call, no Wish row, ever.
      setList((prev) => [{ id: `local-${Date.now()}`, inviteId: "demo", name: data.name, message: data.message, createdAt: new Date() }, ...prev]);
      setSuccess(true);
      reset();
      return;
    }
    startTransition(async () => {
      const res = await submitWish(inviteId as string, data);
      if ("success" in res) {
        setList((prev) => [{ id: `local-${Date.now()}`, inviteId: inviteId as string, name: data.name, message: data.message, createdAt: new Date() }, ...prev]);
        setSuccess(true);
        reset();
      } else {
        setServerError(res.error);
      }
    });
  });

  return (
    <section className="py-16 sm:py-20 px-4" style={{ background: "var(--cream)", borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto">
        <p className="invite-kicker text-center mb-3" style={{ color: "var(--gold)" }}>{t.kicker}</p>
        <h2 className="heading-display invite-headline mb-6 text-center" style={{ color: "var(--charcoal)" }}>
          {t.heading}
        </h2>

        {/* One wish at a time on a swipeable carousel once there's more than
            one (§13/§7) — real persisted Wish[] on a published invite;
            original, clearly-generic sample content in demo mode; never
            invented to look like a real guest either way. */}
        {list.length > 0 && (
          <SwipeTrack accent={accent} labelPrev={t.navPrev} labelNext={t.navNext} itemClassName="w-full" className="mb-8">
            {list.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl p-6 min-h-[176px] flex flex-col items-center justify-center text-center"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <p className="heading-display invite-headline font-semibold" style={{ color: "var(--charcoal)" }}>{w.name}</p>
                <p className="invite-caption mt-1 mb-4" style={{ color: accent }}>{t.wishCaption}</p>
                <p className="invite-body leading-relaxed break-words">{w.message}</p>
                {w.createdAt && <p className="invite-caption mt-4" style={{ color: "var(--muted)" }}>{fmtWishDate(w.createdAt)}</p>}
              </div>
            ))}
          </SwipeTrack>
        )}

        <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4" noValidate>
          <Input label="Аты-жөніңіз" placeholder="Айдар Сейітов" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <Textarea label="Тілегіңіз" placeholder="Бақытты болыңыздар!" rows={3} error={errors.message?.message} {...register("message")} />
          {serverError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</p>
          )}
          {success && !serverError && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Тілегіңіз жіберілді, рахмет!</p>
          )}
          <Button type="submit" loading={isPending} className="w-full">
            Жіберу
          </Button>
        </form>
      </div>
    </section>
  );
}
