"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Wish } from "@prisma/client";
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
  inviteId: string;
  wishes: Wish[];
  accent: string;
  cardBg: string;
  cardBorder: string;
  sectionDivider?: string;
}

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

/**
 * Guest-facing wishes wall — the WISHES paid add-on (§15/§18). A genuinely
 * new, persisted feature (Prisma `Wish` model, additive migration), NOT to
 * be confused with the pre-existing static `wishesText` block rendered
 * right above this in page.tsx (the couple's own message TO guests).
 */
export function WishesWall({ inviteId, wishes, accent, cardBg, cardBorder, sectionDivider }: Props) {
  const [list, setList] = useState(wishes);
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
    startTransition(async () => {
      const res = await submitWish(inviteId, data);
      if ("success" in res) {
        setList((prev) => [{ id: `local-${Date.now()}`, inviteId, name: data.name, message: data.message, createdAt: new Date() }, ...prev]);
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
        <p className="label-caps text-center mb-2" style={{ color: "var(--gold)" }}>Тілектер</p>
        <h2 className="heading-display text-2xl mb-6 text-center" style={{ color: "var(--charcoal)" }}>
          Тілек қалдырыңыз
        </h2>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4 mb-8" noValidate>
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

        {/* One wish at a time on a swipeable carousel once there's more than
            one (§13) — the exact same real, persisted Wish[] either way,
            never invented content. */}
        {list.length > 0 && (
          <SwipeTrack accent={accent} labelPrev="Алдыңғы тілек" labelNext="Келесі тілек" itemClassName="w-full">
            {list.map((w) => (
              <div key={w.id} className="rounded-2xl p-5 min-h-[104px] flex flex-col justify-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <p className="text-sm leading-relaxed break-words" style={{ color: "var(--charcoal)" }}>{w.message}</p>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <p className="text-xs font-semibold" style={{ color: accent }}>— {w.name}</p>
                  {w.createdAt && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{fmtWishDate(w.createdAt)}</p>}
                </div>
              </div>
            ))}
          </SwipeTrack>
        )}
      </div>
    </section>
  );
}
