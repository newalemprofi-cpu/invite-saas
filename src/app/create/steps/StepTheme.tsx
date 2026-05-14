"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, THEMES } from "@/types/invite";
import { cn } from "@/lib/utils";

export function StepTheme() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const selected = watch("theme");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Тема</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруыңыздың сыртқы көрінісін таңдаңыз
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() =>
                setValue("theme", theme.id, { shouldValidate: true })
              }
              className={cn(
                "flex items-center gap-4 p-3.5 rounded-2xl border-2 text-left transition-all duration-150",
                isSelected
                  ? "border-rose-400 bg-rose-50 shadow-sm"
                  : "border-zinc-100 bg-white hover:border-zinc-200"
              )}
            >
              {/* Mini gradient swatch */}
              <div
                className={cn(
                  "w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br flex items-center justify-center shadow-sm",
                  `bg-gradient-to-br ${theme.gradient}`
                )}
              >
                <span className="text-lg">✦</span>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-rose-700" : "text-zinc-800"
                  )}
                >
                  {theme.name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{theme.desc}</p>
              </div>

              {/* Check */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  isSelected
                    ? "border-rose-500 bg-rose-500"
                    : "border-zinc-200 bg-white"
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
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
  );
}
