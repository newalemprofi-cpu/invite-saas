"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { type CreateInviteFormData, TEMPLATES, CATEGORIES } from "@/types/invite";
import { cn } from "@/lib/utils";

interface Props {
  onNext?: () => void;
}

export function StepTemplate({ onNext }: Props) {
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<CreateInviteFormData>();

  const selectedTemplate = watch("template");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = TEMPLATES.filter((t) =>
    (t.categories as readonly string[]).includes(activeCategory)
  );

  const select = async (id: string) => {
    setValue("template", id, { shouldValidate: false });
    const valid = await trigger("template");
    if (valid) onNext?.();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Шаблонды таңдаңыз</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Шақыруыңыздың стилін таңдаңыз
        </p>
      </div>

      {errors.template && (
        <p className="text-sm text-red-500">{errors.template.message}</p>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              activeCategory === cat.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((tmpl) => {
          const isSelected = selectedTemplate === tmpl.id;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => select(tmpl.id)}
              className={cn(
                "relative flex flex-col rounded-2xl overflow-hidden border-2 transition-all text-left",
                isSelected
                  ? "border-rose-500 shadow-lg shadow-rose-100"
                  : "border-zinc-100 hover:border-zinc-300"
              )}
            >
              {/* Gradient preview */}
              <div
                className={cn(
                  "relative h-32 bg-gradient-to-br flex flex-col items-center justify-center p-3",
                  tmpl.gradient
                )}
              >
                <span className="text-4xl mb-1.5">{tmpl.emoji}</span>
                <p
                  className="text-[11px] font-bold text-center leading-tight"
                  style={{ color: tmpl.textColor }}
                >
                  {tmpl.name}
                </p>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white px-3 py-2.5">
                <p className="text-xs font-semibold text-zinc-800 truncate">
                  {tmpl.name}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {tmpl.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
