import type { Metadata } from "next";
import { TemplatesManager } from "./TemplatesManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Шаблондар — Admin" };

export default function AdminTemplatesPage() {
  return <TemplatesManager />;
}
