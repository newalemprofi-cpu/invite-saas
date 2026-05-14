export const PLANS = {
  BASIC: {
    id: "BASIC" as const,
    name: "Basic",
    nameKk: "Базалық",
    price: 4_990,
    days: 30,
    features: ["30 күн белсенді", "Шексіз қонақтар", "RSVP жинау"],
    popular: false,
  },
  STANDARD: {
    id: "STANDARD" as const,
    name: "Standard",
    nameKk: "Стандарт",
    price: 9_990,
    days: 90,
    features: ["90 күн белсенді", "Шексіз қонақтар", "RSVP жинау", "QR-код"],
    popular: true,
  },
  PREMIUM: {
    id: "PREMIUM" as const,
    name: "Premium",
    nameKk: "Премиум",
    price: 19_990,
    days: 180,
    features: [
      "180 күн белсенді",
      "Шексіз қонақтар",
      "RSVP жинау",
      "QR-код",
      "Басымдықты қолдау",
    ],
    popular: false,
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
