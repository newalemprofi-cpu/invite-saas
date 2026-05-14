"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData } from "@/types/invite";
import { Input } from "@/components/ui/Input";

export function StepLocation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Орны</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Іс-шара қайда өтеді?
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Орынның атауы"
          placeholder="мыс. Rixos Hotel, Алматы"
          error={errors.locationName?.message}
          {...register("locationName")}
        />

        <Input
          label="Картаға сілтеме (міндетті емес)"
          placeholder="https://2gis.kz/... немесе Google Maps"
          hint="2GIS, Google Maps немесе Яндекс Карты сілтемесін беруге болады"
          error={errors.mapUrl?.message}
          {...register("mapUrl")}
        />
      </div>

      {/* Map providers */}
      <div className="flex flex-wrap gap-2">
        {["2GIS", "Google Maps", "Яндекс Карты"].map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
