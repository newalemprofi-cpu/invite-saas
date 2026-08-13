"use client";

import { useState, useTransition } from "react";
import { updateSettingsAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  price: number;
  activeDays: number;
  kaspiPaymentLink: string;
  orderWhatsapp: string;
  receiptWhatsapp: string;
  companyPhone: string;
  companyEmail: string;
  instagramUrl: string;
  tiktokUrl: string;
  promoCodesEnabled: boolean;
}

export function SettingsForm({
  price, activeDays, kaspiPaymentLink, orderWhatsapp, receiptWhatsapp,
  companyPhone, companyEmail, instagramUrl, tiktokUrl, promoCodesEnabled,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSettingsAction(fd);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormSection title="Сайт баптаулары">
        <Input label="Баға (₸)" type="number" name="price" defaultValue={price} min={0} required />
        <Input label="Белсенді күн саны" type="number" name="activeDays" defaultValue={activeDays} min={1} required />
        <Input
          label="Kaspi сілтемесі (міндетті емес)"
          type="url"
          name="kaspiPaymentLink"
          defaultValue={kaspiPaymentLink}
          placeholder="https://kaspi.kz/pay/..."
        />
      </FormSection>

      <FormSection title="WhatsApp">
        <Input
          label="Шақыруға тапсырыс беру WhatsApp нөмірі"
          type="tel"
          name="orderWhatsapp"
          defaultValue={orderWhatsapp}
          placeholder="+77010000000"
          required
        />
        <Input
          label="Чек жіберетін WhatsApp нөмірі"
          type="tel"
          name="receiptWhatsapp"
          defaultValue={receiptWhatsapp}
          placeholder="+77010000000"
          required
        />
      </FormSection>

      <FormSection title="Контактілер">
        <Input label="Негізгі телефон" type="tel" name="companyPhone" defaultValue={companyPhone} placeholder="+77010000000" />
        <Input label="Email" type="email" name="companyEmail" defaultValue={companyEmail} placeholder="hello@shaqyru.kz" />
        <Input label="Instagram сілтемесі" type="url" name="instagramUrl" defaultValue={instagramUrl} placeholder="https://instagram.com/shaqyru" />
        <Input label="TikTok сілтемесі" type="url" name="tiktokUrl" defaultValue={tiktokUrl} placeholder="https://tiktok.com/@shaqyru" />
      </FormSection>

      <FormSection title="Промокодтар">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="promoCodesEnabled"
            defaultChecked={promoCodesEnabled}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm font-medium text-zinc-700">Промокодтарды қосу</span>
        </label>
        <p className="text-xs text-zinc-500">Қосылған кезде клиент төлем кезінде промокод енгізе алады.</p>
      </FormSection>

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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="label-caps" style={{ color: "var(--gold)" }}>{title}</p>
      {children}
    </div>
  );
}
