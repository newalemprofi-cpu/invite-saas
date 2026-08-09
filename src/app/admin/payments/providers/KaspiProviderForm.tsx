"use client";

import { useState, useTransition } from "react";
import { updateKaspiLinkAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { ProviderEntry, KaspiLinkConfig } from "@/lib/payment-providers";

interface Props {
  provider: ProviderEntry<KaspiLinkConfig>;
}

export function KaspiProviderForm({ provider }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [enabled, setEnabled] = useState(provider.enabled);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateKaspiLinkAction(fd);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-800">Қосулы</p>
          <p className="text-xs text-zinc-400">Өшірулі болса, пайдаланушылар төлей алмайды</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--charcoal)" }}>
          Режим
        </label>
        <select name="mode" defaultValue={provider.mode} className="input-premium">
          <option value="LIVE">LIVE</option>
          <option value="TEST">TEST</option>
        </select>
      </div>

      <Input
        label="Валюта"
        value="KZT"
        disabled
        hint="Қазіргі уақытта тек KZT қолдау көрсетіледі"
      />

      <Input
        label="Kaspi төлем сілтемесі"
        type="url"
        name="paymentUrl"
        defaultValue={provider.config.paymentUrl}
        placeholder="https://pay.kaspi.kz/..."
      />

      <Input
        label="Мерчант/байланыс телефоны"
        type="tel"
        name="merchantPhone"
        defaultValue={provider.config.merchantPhone}
        placeholder="+7 701 000 00 00"
        hint="Пайдаланушыға көрсетілетін, аударым жасалатын нөмір"
      />

      <Input
        label="Admin email (байланыс үшін)"
        type="email"
        name="adminEmail"
        defaultValue={provider.config.adminEmail}
        placeholder="you@example.com"
      />

      <Input
        label="Admin телефоны (байланыс үшін)"
        type="tel"
        name="adminPhone"
        defaultValue={provider.config.adminPhone}
        placeholder="+7 701 000 00 00"
      />

      <Textarea
        label="Нұсқаулық (қазақша)"
        name="instructionsKk"
        defaultValue={provider.config.instructionsKk}
        rows={3}
        hint="Әр жол — жеке қадам ретінде көрсетіледі"
      />

      <Textarea
        label="Инструкция (русский)"
        name="instructionsRu"
        defaultValue={provider.config.instructionsRu}
        rows={3}
        hint="Каждая строка отображается как отдельный шаг"
      />

      <Input
        label="Төлем мерзімі (минут, 0 = шектеусіз)"
        type="number"
        name="timeoutMinutes"
        defaultValue={provider.config.timeoutMinutes}
        min={0}
      />

      <Input label="Растау режимі" value="MANUAL_APPROVAL" disabled />

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
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
