import { cn } from "@/lib/utils";

type Status =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PUBLISHED"
  | "EXPIRED"
  | "CANCELLED";

const CONFIG: Record<Status, { label: string; cls: string }> = {
  DRAFT: { label: "Жоба", cls: "bg-zinc-100 text-zinc-600" },
  PENDING_PAYMENT: { label: "Төлем күтілуде", cls: "bg-amber-100 text-amber-700" },
  PAID: { label: "Төленді", cls: "bg-blue-100 text-blue-700" },
  PUBLISHED: { label: "Жарияланды", cls: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "Мерзімі өтті", cls: "bg-red-100 text-red-600" },
  CANCELLED: { label: "Болдырылмады", cls: "bg-zinc-100 text-zinc-400" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = CONFIG[status as Status] ?? CONFIG.DRAFT;
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
