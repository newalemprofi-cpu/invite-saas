"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData } from "@/types/invite";

const PLAN = {
  name: "Стандарт",
  price: "4 990 ₸",
  features: [
    "Шексіз қонақтарға жіберу",
    "RSVP жинау",
    "QR-код генерациясы",
    "30 күн белсенді",
  ],
};

export function StepPayment() {
  const { watch } = useFormContext<CreateInviteFormData>();
  const title = watch("title");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Жоба сақтау</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруды жоба ретінде сақтаңыз және кейін төлем жасаңыз
        </p>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-zinc-50">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Тапсырыс
          </p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                {title || "Шақыру"}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">{PLAN.name} жоспар</p>
            </div>
            <p className="text-lg font-bold text-zinc-900">{PLAN.price}</p>
          </div>
        </div>
        <ul className="px-5 py-4 flex flex-col gap-2">
          {PLAN.features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-600">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Payment coming soon notice */}
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">🔧</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Төлем жақын арада қосылады
          </p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Kaspi, APIpay және CloudPayments қосылуда. Қазір жоба ретінде
            сақтаңыз — жариялауға дайын болған кезде төлей аласыз.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        «Жобаны сақтау» батырмасын басу арқылы шақыру{" "}
        <span className="font-medium text-zinc-600">DRAFT</span> күйінде
        сақталады.
      </p>
    </div>
  );
}
