import type { Metadata } from "next";
import { Spectral, Manrope, Montserrat } from "next/font/google";
import "./globals.css";

// Replaces Cormorant_Garamond/DM_Sans, which despite requesting a
// "cyrillic" subset never actually shipped glyphs for it (confirmed by
// fetching Google Fonts' own served CSS: the exact same font file came
// back byte-identical regardless of subset requested) — every Kazakh/
// Russian character on the whole site was silently falling back to the
// browser's default serif/sans-serif. Spectral, Manrope and Montserrat all
// genuinely ship a "cyrillic-ext" unicode-range (verified the same way)
// that covers every Kazakh-specific letter (Ә Ғ Қ Ң Ө Ұ Ү Һ І and lowercase).
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Global default body/UI font — still used by /i/[slug] published
// invitations (per-invitation `fontFamily: "sans"` choice), the editor,
// dashboard and admin. Deliberately left untouched by the marketing site's
// Montserrat switch below: invitation template typography must never be
// globally forced to a different family.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// UI/body font for the public MARKETING site only (header, hero copy,
// buttons, nav, category/template card text, footer). Applied via a
// `--font-montserrat` custom property, referenced only from the marketing
// page roots (/, /templates, /templates/[slug]) — see the `fontFamily`
// override next to each page's `colorVars`. Never touches the global
// `--font-sans` default above, so real invitations keep Manrope.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Шақыру — Премиум цифрлы шақырулар",
    template: "%s — Шақыру",
  },
  description:
    "Элегантты цифрлы шақырулар. Үйлену той, ұзату, туылған күн үшін. Kaspi арқылы төлеу. RSVP жинау.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    siteName: "Шақыру",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="kk"
      className={`${spectral.variable} ${manrope.variable} ${montserrat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
