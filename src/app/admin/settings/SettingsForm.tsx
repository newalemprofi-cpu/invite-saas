"use client";

import { useState, useTransition } from "react";
import { updateProductSettingsAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  price: number;
  activeDays: number;
  kaspiPaymentLink: string;
}

export function SettingsForm({ price, activeDays, kaspiPaymentLink }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProductSettingsAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Баға (₸)"
        type="number"
        name="price"
        defaultValue={price}
        min={0}
        required
      />
      <Input
        label="Белсенді күн саны"
        type="number"
        name="activeDays"
        defaultValue={activeDays}
        min={1}
        required
      />
      <Input
        label="Kaspi сілтемесі (міндетті емес)"
        type="url"
        name="kaspiPaymentLink"
        defaultValue={kaspiPaymentLink}
        placeholder="https://kaspi.kz/pay/..."
      />

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
