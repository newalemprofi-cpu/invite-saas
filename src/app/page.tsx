import type { Metadata } from "next";
import { OnboardingQuiz } from "@/components/OnboardingQuiz";
import { getAdminConfig } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шақыру — Онлайн шақыру жасаңыз",
  description:
    "Үйлену той, ұзату, туылған күн үшін премиум цифрлы шақырулар. 5 минутта дайын. Kaspi арқылы төлеу.",
};

export default async function HomePage() {
  const config = await getAdminConfig();
  return <OnboardingQuiz adminPhone={config.whatsapp} />;
}
