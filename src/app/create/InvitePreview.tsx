"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData } from "@/types/invite";
import { StaticInviteCard } from "@/components/StaticInviteCard";

export function InvitePreview() {
  const { watch } = useFormContext<CreateInviteFormData>();
  return <StaticInviteCard data={watch()} />;
}
