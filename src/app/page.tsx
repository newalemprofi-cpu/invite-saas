import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingQuiz } from "@/components/OnboardingQuiz";
import { getAdminConfig } from "@/lib/admin-config";
import { getSession } from "@/lib/auth";
import { resolveLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шақыру — Онлайн шақыру жасаңыз",
  description:
    "Үйлену той, ұзату, туылған күн үшін премиум цифрлы шақырулар. 5 минутта дайын. Kaspi арқылы төлеу.",
};

interface Props {
  searchParams: Promise<{ lang?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const session = await getSession();

  // A returning customer opening the homepage should land on their
  // invitations, not be pushed through onboarding again. Admin sessions are
  // deliberately excluded — opening "/" must never force an admin into the
  // customer dashboard (see B9). The explicit "+ Жаңа" button on that
  // dashboard links straight to /templates, never back through "/", so this
  // redirect can never trap an authenticated user who wants a NEW invite.
  if (session && session.role === "USER") {
    redirect(`/dashboard?lang=${lang}`);
  }

  const config = await getAdminConfig();
  return <OnboardingQuiz adminPhone={config.whatsapp} authenticated={!!session} initialLang={lang} />;
}
