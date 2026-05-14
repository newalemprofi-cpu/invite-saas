import type { Metadata } from "next";
import { CreateWizard } from "./CreateWizard";

export const metadata: Metadata = {
  title: "Шақыру жасау — Шақыру",
  description: "Онлайн шақыру жасаңыз",
};

export default function CreatePage() {
  return <CreateWizard />;
}
