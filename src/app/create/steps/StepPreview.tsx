"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, THEMES, EVENT_TYPES } from "@/types/invite";
import { InvitePreview } from "../InvitePreview";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-3 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-zinc-800 text-right break-words max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

export function StepPreview() {
  const { watch } = useFormContext<CreateInviteFormData>();
  const data = watch();

  const theme = THEMES.find((t) => t.id === data.theme);
  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Алдын ала көру</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыру осылай көрінеді — артқа оралып өзгерте аласыз
        </p>
      </div>

      {/* Live preview card */}
      <InvitePreview />

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Мәліметтер
        </p>
        <Row label="Іс-шара" value={eventType?.label} />
        <Row label="Тақырып" value={data.title} />
        <Row
          label="Күні"
          value={
            data.date
              ? new Date(data.date).toLocaleDateString("kk-KZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined
          }
        />
        <Row label="Уақыты" value={data.time ? `Сағат ${data.time}` : undefined} />
        <Row label="Орны" value={data.locationName} />
        <Row label="Тема" value={theme?.name} />
        {data.message && <Row label="Хабарлама" value={data.message} />}
      </div>
    </div>
  );
}
