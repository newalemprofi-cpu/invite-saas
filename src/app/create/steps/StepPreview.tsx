"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData } from "@/types/invite";
import { InviteRenderer } from "@/components/InviteRenderer";

export function StepPreview() {
  const { watch } = useFormContext<CreateInviteFormData>();
  const data = watch();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Алдын ала көру</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыру осылай көрінеді — артқа оралып өзгерте аласыз
        </p>
      </div>

      {/* Phone mockup */}
      <div className="flex justify-center">
        <div className="relative w-[280px] rounded-[40px] border-8 border-zinc-900 shadow-2xl overflow-hidden bg-zinc-900">
          {/* Notch */}
          <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
            <div className="w-24 h-6 bg-zinc-900 rounded-b-2xl" />
          </div>

          {/* Screen */}
          <div
            className="overflow-y-auto overscroll-contain bg-white"
            style={{ height: 560, marginTop: 24 }}
          >
            <InviteRenderer
              data={{
                template: data.template,
                eventType: data.eventType,
                groomName: data.groomName,
                brideName: data.brideName,
                date: data.date,
                time: data.time,
                location: data.location,
                mapLink: data.mapLink,
                whatsapp: data.whatsapp,
                invitationText: data.invitationText,
                enabledBlocks: data.enabledBlocks,
              }}
              compact
            />
          </div>

          {/* Home bar */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
            <div className="w-20 h-1 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400 text-center">
        Шақыруыңызды жоба ретінде сақтаңыз — төлем кейінірек Dashboard-тан жасалады
      </p>
    </div>
  );
}
