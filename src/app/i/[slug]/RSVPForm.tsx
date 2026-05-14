"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { submitRSVP } from "@/app/actions/rsvp";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  phone: z.string().max(20).optional(),
  status: z.enum(["COMING", "NOT_COMING", "MAYBE"]),
  peopleCount: z.number().int().min(1).max(20),
  comment: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;
type RSVPStatus = "COMING" | "NOT_COMING" | "MAYBE";

const STATUS_OPTIONS: {
  value: RSVPStatus;
  label: string;
  emoji: string;
  activeClass: string;
}[] = [
  {
    value: "COMING",
    label: "Барамын",
    emoji: "✅",
    activeClass: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
  {
    value: "MAYBE",
    label: "Белгісіз",
    emoji: "🤔",
    activeClass: "border-amber-400 bg-amber-50 text-amber-700",
  },
  {
    value: "NOT_COMING",
    label: "Бармаймын",
    emoji: "❌",
    activeClass: "border-red-300 bg-red-50 text-red-600",
  },
];

// ─── Success states ───────────────────────────────────────────────────────────

function SuccessState({
  status,
  count,
}: {
  status: RSVPStatus;
  count: number;
}) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status)!;
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center flex flex-col items-center gap-3">
      <div className="text-5xl">🎉</div>
      <h3 className="text-xl font-bold text-zinc-900">Жауабыңыз қабылданды!</h3>
      <p className="text-zinc-500 text-sm">
        {opt.emoji}{" "}
        <span className="font-medium">{opt.label}</span>
        {count > 1 && (
          <span className="text-zinc-400"> · {count} адам</span>
        )}
      </p>
    </div>
  );
}

function DuplicateState() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center flex flex-col items-center gap-3">
      <div className="text-5xl">✅</div>
      <h3 className="text-xl font-bold text-zinc-900">
        Жауап бұрын тіркелген
      </h3>
      <p className="text-sm text-zinc-500">
        Бұл телефон нөміріне жауап бұрын жіберілген.
      </p>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function RSVPForm({ inviteId }: { inviteId: string }) {
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<
    "success" | "duplicate" | null
  >(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "COMING", peopleCount: 1 },
  });

  const selectedStatus = watch("status");
  const count = watch("peopleCount") ?? 1;

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitRSVP(inviteId, data);
      if ("success" in res) setOutcome("success");
      else if ("duplicate" in res) setOutcome("duplicate");
      else setServerError(res.error);
    });
  });

  if (outcome === "success") return <SuccessState status={selectedStatus} count={count} />;
  if (outcome === "duplicate") return <DuplicateState />;

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-5"
      noValidate
    >
      {/* Status selector */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">Жауабыңыз</span>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setValue("status", opt.value, { shouldValidate: true })
              }
              className={cn(
                "flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150",
                selectedStatus === opt.value
                  ? opt.activeClass
                  : "border-zinc-100 text-zinc-500 hover:border-zinc-200 bg-white"
              )}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <Input
        label="Аты-жөніңіз"
        placeholder="Айдар Сейітов"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* Phone */}
      <Input
        type="tel"
        label="Телефон (міндетті емес)"
        placeholder="+7 701 000 00 00"
        autoComplete="tel"
        hint="Телефон қайталанатын жауаптарды болдырмайды"
        error={errors.phone?.message}
        {...register("phone")}
      />

      {/* People count stepper */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Адамдар саны</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={count <= 1}
            onClick={() => setValue("peopleCount", count - 1)}
            className="w-11 h-11 rounded-xl border border-zinc-200 flex items-center justify-center text-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            −
          </button>
          <span className="text-2xl font-bold text-zinc-900 w-8 text-center tabular-nums">
            {count}
          </span>
          <button
            type="button"
            disabled={count >= 20}
            onClick={() => setValue("peopleCount", count + 1)}
            className="w-11 h-11 rounded-xl border border-zinc-200 flex items-center justify-center text-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            +
          </button>
          <span className="text-sm text-zinc-400">адам</span>
        </div>
        {errors.peopleCount && (
          <p className="text-xs text-red-500">{errors.peopleCount.message}</p>
        )}
      </div>

      {/* Comment */}
      <Textarea
        label="Пікір (міндетті емес)"
        placeholder="Тілектер, сұрақтар немесе аллергияларыңыз..."
        rows={3}
        error={errors.comment?.message}
        {...register("comment")}
      />

      {/* Server error */}
      {serverError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isPending} size="lg" className="w-full">
        Жауап жіберу
      </Button>
    </form>
  );
}
