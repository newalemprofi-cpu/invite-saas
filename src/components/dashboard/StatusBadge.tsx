import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

type Status =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PUBLISHED"
  | "EXPIRED"
  | "CANCELLED";

const CONFIG: Record<Lang, Record<Status, { label: string; cls: string }>> = {
  kk: {
    DRAFT: { label: "Жоба", cls: "bg-zinc-100 text-zinc-600" },
    PENDING_PAYMENT: { label: "Төлем күтілуде", cls: "bg-amber-100 text-amber-700" },
    PAID: { label: "Төленді", cls: "bg-blue-100 text-blue-700" },
    PUBLISHED: { label: "Жарияланды", cls: "bg-emerald-100 text-emerald-700" },
    EXPIRED: { label: "Мерзімі өтті", cls: "bg-red-100 text-red-600" },
    CANCELLED: { label: "Болдырылмады", cls: "bg-zinc-100 text-zinc-400" },
  },
  ru: {
    DRAFT: { label: "Черновик", cls: "bg-zinc-100 text-zinc-600" },
    PENDING_PAYMENT: { label: "Ожидает оплаты", cls: "bg-amber-100 text-amber-700" },
    PAID: { label: "Оплачено", cls: "bg-blue-100 text-blue-700" },
    PUBLISHED: { label: "Опубликовано", cls: "bg-emerald-100 text-emerald-700" },
    EXPIRED: { label: "Срок истёк", cls: "bg-red-100 text-red-600" },
    CANCELLED: { label: "Отменено", cls: "bg-zinc-100 text-zinc-400" },
  },
};

export function StatusBadge({ status, lang = "kk" }: { status: Status; lang?: Lang }) {
  const { label, cls } = CONFIG[lang][status as Status] ?? CONFIG[lang].DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cls
      )}
    >
      {label}
    </span>
  );
}
