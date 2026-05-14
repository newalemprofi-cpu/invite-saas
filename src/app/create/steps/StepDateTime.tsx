"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData } from "@/types/invite";
import { Input } from "@/components/ui/Input";

export function StepDateTime() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Күні мен уақыты</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Іс-шара қашан өтеді?
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          type="date"
          label="Күні"
          error={errors.date?.message}
          min={new Date().toISOString().split("T")[0]}
          {...register("date")}
        />

        <Input
          type="time"
          label="Уақыты"
          error={errors.time?.message}
          {...register("time")}
        />
      </div>

      {/* Visual reminder */}
      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">📅</span>
        <div>
          <p className="text-sm font-medium text-zinc-700">Маңызды</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Шақыру жасалғаннан кейін 30 күн бойы белсенді болады. Күнді
            мұқият таңдаңыз.
          </p>
        </div>
      </div>
    </div>
  );
}
