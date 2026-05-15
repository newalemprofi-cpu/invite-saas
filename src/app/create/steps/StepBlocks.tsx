"use client";

import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, BLOCKS } from "@/types/invite";
import { cn } from "@/lib/utils";

export function StepBlocks() {
  const { watch, setValue } = useFormContext<CreateInviteFormData>();
  const blocks = watch("blocks") ?? [];

  const toggle = (blockId: string) => {
    const next = blocks.includes(blockId)
      ? blocks.filter((b) => b !== blockId)
      : [...blocks, blockId];
    setValue("blocks", next, { shouldValidate: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Қосымша блоктар</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруыңызға қосқыңыз келетін блоктарды таңдаңыз (міндетті емес)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BLOCKS.map((block) => {
          const isSelected = blocks.includes(block.id);
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => toggle(block.id)}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                isSelected
                  ? "border-rose-400 bg-rose-50 shadow-sm"
                  : "border-zinc-100 bg-white hover:border-zinc-200"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl leading-none">{block.icon}</span>
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "border-rose-500 bg-rose-500" : "border-zinc-200")}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={cn("text-sm font-semibold", isSelected ? "text-rose-700" : "text-zinc-800")}>
                {block.nameKk}
              </span>
            </button>
          );
        })}
      </div>

      {blocks.length > 0 && (
        <p className="text-xs text-zinc-500 text-center">
          {blocks.length} блок таңдалды
        </p>
      )}
    </div>
  );
}
