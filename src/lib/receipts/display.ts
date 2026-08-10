/**
 * Display-only formatting for receipt datetimes. The stored value is
 * always a correct UTC instant (see verify.ts's parseReceiptDatetime) —
 * this never changes that. It only renders it back as the Astana wall-clock
 * time the receipt itself printed, regardless of the viewing admin's own
 * browser timezone, instead of a raw UTC ISO string.
 */
import type { Lang } from "@/lib/i18n";

const ASTANA_UTC_OFFSET_HOURS = 5;

export function formatAstanaDateTime(date: Date, lang: Lang): string {
  const shifted = new Date(date.getTime() + ASTANA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = shifted.getUTCFullYear();
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
  const suffix = lang === "ru" ? "(время Астаны)" : "(Астана уақыты)";
  return `${dd}.${mm}.${yyyy} ${hh}:${mi} ${suffix}`;
}
