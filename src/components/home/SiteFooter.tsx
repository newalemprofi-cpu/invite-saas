import Link from "next/link";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  footerText: string;
}

const T = {
  kk: { templates: "Шаблондар", login: "Кіру" },
  ru: { templates: "Шаблоны", login: "Войти" },
} as const;

export function SiteFooter({ lang, footerText }: Props) {
  const t = T[lang];
  return (
    <footer
      className="py-8 px-4 text-center text-sm"
      style={{ borderTop: "1px solid var(--border)", color: "var(--muted)", background: "var(--ivory)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <Link href={`/?lang=${lang}`} style={{ color: "var(--gold)" }} className="font-serif font-semibold">
          Шақыру
        </Link>
        <span className="hidden sm:inline">·</span>
        <span>{footerText}</span>
        <span className="hidden sm:inline">·</span>
        <Link href={`/templates?lang=${lang}`} className="hover:underline">{t.templates}</Link>
      </div>
    </footer>
  );
}
