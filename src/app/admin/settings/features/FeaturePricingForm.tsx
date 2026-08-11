"use client";

import { useState, useTransition } from "react";
import { updateFeaturePricingAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features";
import type { FeaturePricingConfig } from "@/lib/feature-pricing";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  music: "Музыка",
  gallery: "Галерея",
  rsvp: "Қатысуды растау (RSVP)",
  map: "Карта",
  wishes: "Тілек",
  analytics: "Статистика",
};

interface Props {
  pricing: FeaturePricingConfig;
}

export function FeaturePricingForm({ pricing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateFeaturePricingAction(fd);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {FEATURE_KEYS.map((key) => (
        <FeatureSection key={key} featureKey={key} label={FEATURE_LABELS[key]} value={pricing[key]} />
      ))}

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between">
          <p className="label-caps" style={{ color: "var(--gold)" }}>QR-код (әрқашан тегін)</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="qr_enabled" defaultChecked={pricing.qr.enabled} />
            Қосылған
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Атауы (қазақша)" name="qr_titleKk" defaultValue={pricing.qr.titleKk} required />
          <Input label="Атауы (орысша)" name="qr_titleRu" defaultValue={pricing.qr.titleRu} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea label="Сипаттама (қазақша)" name="qr_descKk" defaultValue={pricing.qr.descKk} rows={2} />
          <Textarea label="Сипаттама (орысша)" name="qr_descRu" defaultValue={pricing.qr.descRu} rows={2} />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">
          ✓ Сақталды
        </p>
      )}

      <Button type="submit" loading={isPending}>
        Сақтау
      </Button>
    </form>
  );
}

function FeatureSection({
  featureKey, label, value,
}: {
  featureKey: FeatureKey;
  label: string;
  value: FeaturePricingConfig[FeatureKey];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps" style={{ color: "var(--gold)" }}>{label}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={`${featureKey}_enabled`} defaultChecked={value.enabled} />
          Қосылған
        </label>
      </div>
      <Input label="Баға (₸)" type="number" name={`${featureKey}_price`} defaultValue={value.price} min={0} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Атауы (қазақша)" name={`${featureKey}_titleKk`} defaultValue={value.titleKk} required />
        <Input label="Атауы (орысша)" name={`${featureKey}_titleRu`} defaultValue={value.titleRu} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Textarea label="Сипаттама (қазақша)" name={`${featureKey}_descKk`} defaultValue={value.descKk} rows={2} />
        <Textarea label="Сипаттама (орысша)" name={`${featureKey}_descRu`} defaultValue={value.descRu} rows={2} />
      </div>
    </div>
  );
}
