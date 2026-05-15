"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, BLOCKS_CONFIG, DEFAULT_BLOCKS } from "@/types/invite";
import { cn } from "@/lib/utils";

export function StepBlocks() {
  const { watch, setValue } = useFormContext<CreateInviteFormData>();
  const enabledBlocks = watch("enabledBlocks") ?? DEFAULT_BLOCKS;

  useEffect(() => {
    const current = watch("enabledBlocks");
    if (!current || current.length === 0) {
      setValue("enabledBlocks", DEFAULT_BLOCKS, { shouldValidate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (blockId: string) => {
    const next = enabledBlocks.includes(blockId)
      ? enabledBlocks.filter((b) => b !== blockId)
      : [...enabledBlocks, blockId];
    setValue("enabledBlocks", next, { shouldValidate: false });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Блоктар</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруыңызда қандай бөлімдер болсын дегенді таңдаңыз
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {BLOCKS_CONFIG.map((block) => {
          const isEnabled = enabledBlocks.includes(block.id);
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => toggle(block.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                isEnabled
                  ? "border-rose-300 bg-rose-50"
                  : "border-zinc-100 bg-white hover:border-zinc-200"
              )}
            >
              <span className="text-2xl shrink-0">{block.icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isEnabled ? "text-rose-800" : "text-zinc-800"
                  )}
                >
                  {block.nameKk}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">{block.description}</p>
              </div>

              {/* Toggle switch */}
              <div
                className={cn(
                  "shrink-0 w-11 h-6 rounded-full relative transition-colors duration-200",
                  isEnabled ? "bg-rose-500" : "bg-zinc-200"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400 text-center">
        {enabledBlocks.length} блок қосылған
      </p>
    </div>
  );
}
