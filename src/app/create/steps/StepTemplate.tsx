"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, EVENT_TYPES, THEMES } from "@/types/invite";
import { cn } from "@/lib/utils";

export function StepTemplate() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const selectedType = watch("eventType");
  const selectedTheme = watch("theme");

  return (
    <div className="flex flex-col gap-8">
      {/* Event type */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Іс-шара түрі</h2>
          <p className="text-sm text-zinc-500 mt-1">Қандай іс-шараға шақыру жасайсыз?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue("eventType", type.value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? "border-rose-400 bg-rose-50 shadow-sm shadow-rose-100"
                    : "border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm"
                )}
              >
                <span className="text-2xl leading-none">{type.emoji}</span>
                <span className={cn("text-sm font-semibold leading-tight", isSelected ? "text-rose-700" : "text-zinc-800")}>
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

      {/* Theme */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Тема</h2>
          <p className="text-sm text-zinc-500 mt-1">Шақыруыңыздың сыртқы көрінісін таңдаңыз</p>
        </div>
        <div className="flex flex-col gap-3">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setValue("theme", theme.id, { shouldValidate: true })}
                className={cn(
                  "flex items-center gap-4 p-3.5 rounded-2xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? "border-rose-400 bg-rose-50 shadow-sm"
                    : "border-zinc-100 bg-white hover:border-zinc-200"
                )}
              >
                <div className={cn("w-14 h-14 rounded-xl shrink-0 flex items-center justify-center shadow-sm bg-gradient-to-br", theme.gradient)}>
                  <span className="text-lg">✦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", isSelected ? "text-rose-700" : "text-zinc-800")}>
                    {theme.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{theme.desc}</p>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "border-rose-500 bg-rose-500" : "border-zinc-200 bg-white")}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {errors.theme && (
          <p className="text-xs text-red-500">{errors.theme.message}</p>
        )}
      </div>
    </div>
  );
}
