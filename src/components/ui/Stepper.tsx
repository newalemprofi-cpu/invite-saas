import { cn } from "@/lib/utils";

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center shrink-0">
          {/* Dot + label */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                i < current
                  ? "bg-rose-500 text-white"
                  : i === current
                  ? "bg-rose-500 text-white ring-4 ring-rose-100 scale-110"
                  : "bg-zinc-100 text-zinc-400"
              )}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium hidden sm:block truncate max-w-[56px] text-center leading-tight",
                i === current ? "text-rose-600" : i < current ? "text-zinc-500" : "text-zinc-300"
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector */}
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-6 sm:w-10 mx-1 mb-4 sm:mb-5 shrink-0 transition-colors duration-300",
                i < current ? "bg-rose-400" : "bg-zinc-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
