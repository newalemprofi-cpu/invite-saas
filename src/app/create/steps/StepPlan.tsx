"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, PLANS } from "@/types/invite";

const PLAN_BADGES = {
  BASIC: null,
  STANDARD: "Танымал",
  PREMIUM: "Максималды",
} as const;

export function StepPlan() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const selected = watch("plan");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Жоспар таңдаңыз</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруыңызға сәйкес жоспарды таңдаңыз
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          const badge = PLAN_BADGES[plan.id];

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() =>
                setValue("plan", plan.id, { shouldValidate: true })
              }
              className={[
                "relative w-full text-left rounded-2xl border-2 p-4 transition-all",
                isSelected
                  ? "border-rose-500 bg-rose-50 shadow-sm shadow-rose-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300",
              ].join(" ")}
            >
              {badge && (
                <span className="absolute top-3 right-3 text-xs font-semibold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}

              <div className="flex items-center gap-3 mb-2">
                <span
                  className={[
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSelected
                      ? "border-rose-500 bg-rose-500"
                      : "border-zinc-300",
                  ].join(" ")}
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
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-zinc-900">{plan.name}</span>
                    <span className="text-lg font-bold text-rose-600">
                      {plan.priceLabel}
                    </span>
                  </div>
                </div>
              </div>

              <ul className="ml-8 flex flex-col gap-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-zinc-600"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {errors.plan && (
        <p className="text-sm text-red-500 text-center">
          {errors.plan.message}
        </p>
      )}
    </div>
  );
}
