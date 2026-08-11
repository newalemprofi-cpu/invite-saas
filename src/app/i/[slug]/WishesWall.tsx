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
}

/**
 * Guest-facing wishes wall — the WISHES paid add-on (§15/§18). A genuinely
 * new, persisted feature (Prisma `Wish` model, additive migration), NOT to
 * be confused with the pre-existing static `wishesText` block rendered
 * right above this in page.tsx (the couple's own message TO guests).
 */
export function WishesWall({ inviteId, wishes, accent, cardBg, cardBorder }: Props) {
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
    <section className="py-14 px-4" style={{ background: "var(--cream)" }}>
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

        {list.length > 0 && (
          <div className="flex flex-col gap-3">
            {list.map((w) => (
              <div key={w.id} className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>{w.message}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: accent }}>— {w.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
