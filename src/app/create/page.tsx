import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CreateWizard } from "./CreateWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шақыру жасау — Шақыру",
  description: "Онлайн шақыру жасаңыз",
};

export default async function CreatePage() {
  const session = await getSession();
  if (!session) redirect("/auth/login?from=/create");
  return <CreateWizard />;
}
