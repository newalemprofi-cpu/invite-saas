"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, EVENT_TYPES } from "@/types/invite";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const DUAL_EVENTS = new Set(["WEDDING", "ENGAGEMENT", "ANNIVERSARY"]);

export function StepEventInfo() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const [eventType, groomName, brideName] = watch([
    "eventType",
    "groomName",
    "brideName",
  ]);
  const isDual = DUAL_EVENTS.has(eventType);

  useEffect(() => {
    const p1 = groomName?.trim() ?? "";
    const p2 = brideName?.trim() ?? "";
    if (!p1) return;
    const auto = isDual && p2 ? `${p1} & ${p2}` : p1;
    setValue("title", auto, { shouldValidate: false });
  }, [eventType, groomName, brideName, isDual, setValue]);

  return (
    <div className="flex flex-col gap-8">
      {/* Event type selector */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Іс-шара түрі</h2>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {EVENT_TYPES.map((et) => {
            const isActive = eventType === et.value;
            return (
              <button
                key={et.value}
                type="button"
                onClick={() =>
                  setValue("eventType", et.value, { shouldValidate: true })
                }
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "border-rose-400 bg-rose-50"
                    : "border-zinc-100 bg-white hover:border-zinc-200"
                )}
              >
                <span className="text-lg shrink-0">{et.emoji}</span>
                <span
                  className={cn(
                    "font-medium text-xs leading-tight",
                    isActive ? "text-rose-700" : "text-zinc-700"
                  )}
                >
                  {et.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Names */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-zinc-900">Есімдер</h2>
        <Input
          label={isDual ? "Жігіттің есімі" : "Есім"}
          placeholder="мыс. Айдар"
          error={errors.groomName?.message}
          {...register("groomName")}
        />
        {isDual && (
          <Input
            label="Қыздың есімі"
            placeholder="мыс. Айгерім"
            error={errors.brideName?.message}
            {...register("brideName")}
          />
        )}
        <Input
          label="Шақырудың тақырыбы"
          placeholder="Автоматты толтырылады"
          hint="Өз қалауыңызша өзгертуге болады"
          error={errors.title?.message}
          {...register("title")}
        />
      </div>

      {/* Date & time */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-zinc-900">Күн мен уақыт</h2>
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
        <h2 className="text-xl font-bold text-zinc-900">Орны</h2>
        <Input
          label="Орын атауы"
          placeholder="мыс. Алматы, Almaty Arena"
          error={errors.location?.message}
          {...register("location")}
        />
        <Input
          label="Карта сілтемесі (міндетті емес)"
          placeholder="https://maps.google.com/..."
          hint="Google Maps немесе 2GIS сілтемесі"
          error={errors.mapLink?.message}
          {...register("mapLink")}
        />
        <Input
          label="WhatsApp нөмірі (міндетті емес)"
          placeholder="+7 777 123 45 67"
          error={errors.whatsapp?.message}
          {...register("whatsapp")}
        />
      </div>

      {/* Invitation text */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-zinc-900">
          Шақыру мәтіні (міндетті емес)
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Қонақтарға жеке хат
          </label>
          <textarea
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 resize-none min-h-[100px]"
            placeholder="мыс. Сіздің болуыңыз біз үшін ең үлкен қуаныш!"
            maxLength={800}
            {...register("invitationText")}
          />
          {errors.invitationText && (
            <p className="text-xs text-red-500">
              {errors.invitationText.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
