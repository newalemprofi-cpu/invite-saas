"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-zinc-700"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-zinc-900 resize-none",
            "placeholder:text-zinc-400 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent",
            error
              ? "border-red-400 bg-red-50"
              : "border-zinc-200 hover:border-zinc-300",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
