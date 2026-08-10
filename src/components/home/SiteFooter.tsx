import Link from "next/link";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  /** Already resolved to the current language by the caller (companyDescriptionKk/Ru). */
  companyDescription: string;
  companyPhone: string;
  companyEmail: string;
  /** The footer's general contact channel is an "I want to order/ask" context — always orderWhatsapp, never receiptWhatsapp. */
  orderWhatsapp: string;
  instagramUrl: string;
  tiktokUrl: string;
}

const T = {
  kk: {
    templates: "Шаблондар",
    howItWorks: "Қалай жұмыс істейді",
    contactsTitle: "Контактілер",
    socialTitle: "Әлеуметтік желілер",
    linksTitle: "Сілтемелер",
    whatsapp: "WhatsApp",
  },
  ru: {
    templates: "Шаблоны",
    howItWorks: "Как это работает",
    contactsTitle: "Контакты",
    socialTitle: "Социальные сети",
    linksTitle: "Ссылки",
    whatsapp: "WhatsApp",
  },
} as const;

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function EmailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function WhatsappIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.51 2 12.04 2zm5.8 14.02c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.88-1.25-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.98s.74-2.11 1-2.4c.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.17.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.12.57.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.64-.14.26.1 1.65.78 1.93.92.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16.5 2h-3v13.2a2.8 2.8 0 11-2.8-2.8c.28 0 .55.04.8.11V9.4a5.8 5.8 0 105 5.74V8.6a7.9 7.9 0 004.5 1.4V7a4.9 4.9 0 01-4.5-5z" />
    </svg>
  );
}

export function SiteFooter({ lang, companyDescription, companyPhone, companyEmail, orderWhatsapp, instagramUrl, tiktokUrl }: Props) {
  const t = T[lang];
  const waHref = orderWhatsapp ? `https://wa.me/${orderWhatsapp.replace(/\D/g, "")}` : null;
  const hasSocial = !!instagramUrl || !!tiktokUrl;

  return (
    <footer className="pt-12 pb-8 px-4" style={{ borderTop: "1px solid var(--border)", background: "var(--ivory)" }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:grid sm:grid-cols-3 gap-10 sm:gap-6 text-center sm:text-left">
        {/* Brand + description */}
        <div className="flex flex-col items-center sm:items-start gap-2.5">
          <Link href={`/?lang=${lang}`} className="font-serif text-xl font-semibold" style={{ color: "var(--gold)" }}>
            Шақыру
          </Link>
          {companyDescription && (
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--muted)" }}>{companyDescription}</p>
          )}
        </div>

        {/* Contacts */}
        {(companyPhone || companyEmail || waHref) && (
          <div className="flex flex-col items-center sm:items-start gap-2.5">
            <p className="label-caps" style={{ color: "var(--charcoal)" }}>{t.contactsTitle}</p>
            {companyPhone && (
              <a href={`tel:${companyPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <PhoneIcon /> {companyPhone}
              </a>
            )}
            {companyEmail && (
              <a href={`mailto:${companyEmail}`} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <EmailIcon /> {companyEmail}
              </a>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <WhatsappIcon /> {t.whatsapp}
              </a>
            )}
          </div>
        )}

        {/* Social + quick links */}
        <div className="flex flex-col items-center sm:items-start gap-2.5">
          {hasSocial && (
            <>
              <p className="label-caps" style={{ color: "var(--charcoal)" }}>{t.socialTitle}</p>
              <div className="flex items-center gap-3">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--muted)" }}>
                    <InstagramIcon />
                  </a>
                )}
                {tiktokUrl && (
                  <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={{ color: "var(--muted)" }}>
                    <TikTokIcon />
                  </a>
                )}
              </div>
            </>
          )}
          <div className="flex items-center gap-4 mt-1">
            <Link href={`/templates?lang=${lang}`} className="text-sm hover:underline" style={{ color: "var(--muted)" }}>{t.templates}</Link>
            <a href="#how-it-works" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>{t.howItWorks}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
