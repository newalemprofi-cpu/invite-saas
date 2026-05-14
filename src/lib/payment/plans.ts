export const PLANS = {
  BASIC: {
    id: "BASIC" as const,
    name: "Basic",
    nameKk: "Базалық",
    price: 4_990,
    priceLabel: "4 990 ₸",
    days: 30,
    popular: false,
    features: [
      "1 тіл",
      "30 күн белсенді",
      "RSVP жинау",
      "Қарапайым тема",
    ],
  },
  STANDARD: {
    id: "STANDARD" as const,
    name: "Standard",
    nameKk: "Стандарт",
    price: 9_990,
    priceLabel: "9 990 ₸",
    days: 90,
    popular: true,
    features: [
      "90 күн белсенді",
      "RSVP жинау",
      "Қонақтар тізімі",
      "Көп тема",
    ],
  },
  PREMIUM: {
    id: "PREMIUM" as const,
    name: "Premium",
    nameKk: "Премиум",
    price: 14_990,
    priceLabel: "14 990 ₸",
    days: 180,
    popular: false,
    features: [
      "180 күн белсенді",
      "RSVP жинау",
      "Қонақтар тізімі",
      "Premium тема",
      "Музыка/видео",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.BASIC;
}

export function addPlanDays(from: Date, planId: string): Date {
  const plan = getPlan(planId);
  return new Date(from.getTime() + plan.days * 24 * 60 * 60 * 1000);
}
