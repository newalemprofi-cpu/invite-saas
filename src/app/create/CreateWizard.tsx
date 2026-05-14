"use client";

import { useState, useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createInviteSchema,
  type CreateInviteFormData,
  STEPS,
  STEP_FIELDS,
} from "@/types/invite";
import Link from "next/link";
import { createInviteAction } from "@/app/actions/create-invite";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { StepPlan } from "./steps/StepPlan";
import { StepEventType } from "./steps/StepEventType";
import { StepNames } from "./steps/StepNames";
import { StepDateTime } from "./steps/StepDateTime";
import { StepLocation } from "./steps/StepLocation";
import { StepTheme } from "./steps/StepTheme";
import { StepPreview } from "./steps/StepPreview";
import { StepPayment } from "./steps/StepPayment";

const STEP_COMPONENTS = [
  StepPlan,
  StepEventType,
  StepNames,
  StepDateTime,
  StepLocation,
  StepTheme,
  StepPreview,
  StepPayment,
];

const LAST = STEPS.length - 1;

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const methods = useForm<CreateInviteFormData>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      // plan intentionally omitted — user must select
      eventType: "WEDDING",
      theme: "ROSE_GOLD",
      person1: "",
      person2: "",
      title: "",
      date: "",
      time: "",
      locationName: "",
      mapUrl: "",
      message: "",
    },
    mode: "onTouched",
  });

  const handleNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length ? await methods.trigger(fields) : true;
    if (valid) setStep((s) => Math.min(s + 1, LAST));
  };

  const handleBack = () => {
    setServerError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = methods.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createInviteAction(data);
      if (result?.error) setServerError(result.error);
    });
  });

  const CurrentStep = STEP_COMPONENTS[step];

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-rose-500 text-lg tracking-tight">
            Шақыру
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ✕ Шығу
          </Link>
        </header>

        {/* Stepper */}
        <div className="bg-white border-b border-zinc-100 px-4 pt-4 pb-3">
          <div className="max-w-xl mx-auto">
            <Stepper steps={STEPS} current={step} />
          </div>
        </div>

        {/* Step content */}
        <main className="flex-1 px-4 py-6">
          <div className="max-w-xl mx-auto">
            <CurrentStep />

            {serverError && (
              <div className="mt-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}
          </div>
        </main>

        {/* Navigation — sticky bottom bar */}
        <div className="sticky bottom-0 z-20 bg-white/90 backdrop-blur border-t border-zinc-100 px-4 py-3 safe-bottom">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBack}
              disabled={step === 0 || isPending}
              className="w-28 shrink-0"
            >
              ← Артқа
            </Button>

            {step < LAST ? (
              <Button
                size="lg"
                onClick={handleNext}
                disabled={isPending}
                className="flex-1"
              >
                Келесі →
              </Button>
            ) : (
              <Button
                size="lg"
                loading={isPending}
                onClick={handleSubmit}
                className="flex-1"
              >
                💾 Жобаны сақтау
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
