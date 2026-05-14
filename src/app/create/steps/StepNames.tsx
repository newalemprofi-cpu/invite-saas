"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, EVENT_TYPES } from "@/types/invite";
import { Input } from "@/components/ui/Input";

const DUAL_EVENTS = new Set(["WEDDING", "ENGAGEMENT", "ANNIVERSARY"]);

function buildAutoTitle(
  eventType: string,
  person1: string,
  person2: string
): string {
  const p1 = person1.trim();
  const p2 = person2.trim();
  if (!p1) return "";
  if (DUAL_EVENTS.has(eventType) && p2) return `${p1} & ${p2}`;
  return p1;
}

export function StepNames() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const [eventType, person1, person2] = watch([
    "eventType",
    "person1",
    "person2",
  ]);
  const isDual = DUAL_EVENTS.has(eventType);
  const eventLabel =
    EVENT_TYPES.find((e) => e.value === eventType)?.label ?? "";

  // Auto-generate title from names
  useEffect(() => {
    const autoTitle = buildAutoTitle(eventType, person1 ?? "", person2 ?? "");
    if (autoTitle) setValue("title", autoTitle, { shouldValidate: false });
  }, [eventType, person1, person2, setValue]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Есімдер</h2>
        <p className="text-sm text-zinc-500 mt-1">
          {isDual
            ? `${eventLabel} үшін екі адамның есімін енгізіңіз`
            : `${eventLabel} иесінің атын енгізіңіз`}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label={isDual ? "Бірінші есім" : "Есім"}
          placeholder={isDual ? "мыс. Айдар" : "мыс. Айдар"}
          error={errors.person1?.message}
          {...register("person1")}
        />

        {isDual && (
          <Input
            label="Екінші есім"
            placeholder="мыс. Айгерім"
            error={errors.person2?.message}
            {...register("person2")}
          />
        )}

        <Input
          label="Шақырудың тақырыбы"
          placeholder="Автоматты түрде толтырылады"
          hint="Өз қалауыңыз бойынша өзгертуге болады"
          error={errors.title?.message}
          {...register("title")}
        />
      </div>
    </div>
  );
}
