"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, EVENT_TYPES } from "@/types/invite";
import { cn } from "@/lib/utils";

export function StepEventType() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const selected = watch("eventType");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Іс-шара түрі</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Қандай той немесе іс-шараға шақыру жасағыңыз келеді?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {EVENT_TYPES.map((type) => {
          const isSelected = selected === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setValue("eventType", type.value, { shouldValidate: true })
              }
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                isSelected
                  ? "border-rose-400 bg-rose-50 shadow-sm shadow-rose-100"
                  : "border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm"
              )}
            >
              <span className="text-2xl leading-none">{type.emoji}</span>
              <span
                className={cn(
                  "text-sm font-semibold leading-tight",
                  isSelected ? "text-rose-700" : "text-zinc-800"
                )}
              >
                {type.label}
              </span>
            </button>
          );
        })}
      </div>

      {errors.eventType && (
        <p className="text-xs text-red-500">{errors.eventType.message}</p>
      )}
    </div>
  );
}
