"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, EVENT_TYPES } from "@/types/invite";
import { Input } from "@/components/ui/Input";

const DUAL_EVENTS = new Set(["WEDDING", "ENGAGEMENT", "ANNIVERSARY"]);

function buildAutoTitle(eventType: string, person1: string, person2: string): string {
  const p1 = person1.trim();
  const p2 = person2.trim();
  if (!p1) return "";
  if (DUAL_EVENTS.has(eventType) && p2) return `${p1} & ${p2}`;
  return p1;
}

export function StepEventInfo() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const [eventType, person1, person2] = watch(["eventType", "person1", "person2"]);
  const isDual = DUAL_EVENTS.has(eventType);
  const eventLabel = EVENT_TYPES.find((e) => e.value === eventType)?.label ?? "";

  useEffect(() => {
    const autoTitle = buildAutoTitle(eventType, person1 ?? "", person2 ?? "");
    if (autoTitle) setValue("title", autoTitle, { shouldValidate: false });
  }, [eventType, person1, person2, setValue]);

  return (
    <div className="flex flex-col gap-8">
      {/* Names */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Есімдер</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {isDual
              ? `${eventLabel} үшін екі адамның есімін енгізіңіз`
              : `${eventLabel} иесінің атын енгізіңіз`}
          </p>
        </div>
        <Input
          label={isDual ? "Бірінші есім" : "Есім"}
          placeholder="мыс. Айдар"
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

      {/* Date & time */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Күн мен уақыт</h2>
        </div>
        <Input
          label="Күні"
          type="date"
          error={errors.date?.message}
          {...register("date")}
        />
        <Input
          label="Уақыты"
          type="time"
          error={errors.time?.message}
          {...register("time")}
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Орны</h2>
        </div>
        <Input
          label="Орын атауы"
          placeholder="мыс. Алматы, Almaty Arena"
          error={errors.locationName?.message}
          {...register("locationName")}
        />
        <Input
          label="Карта сілтемесі (міндетті емес)"
          placeholder="https://maps.google.com/..."
          hint="Google Maps немесе 2GIS сілтемесі"
          error={errors.mapUrl?.message}
          {...register("mapUrl")}
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Хабарлама (міндетті емес)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Қонақтарға арнаған хабарлама
          </label>
          <textarea
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 resize-none min-h-[100px]"
            placeholder="мыс. Сіздің келуіңіз біз үшін ең үлкен қуаныш!"
            maxLength={500}
            {...register("message")}
          />
          {errors.message && (
            <p className="text-xs text-red-500">{errors.message.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
