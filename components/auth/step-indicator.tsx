import { cx } from "@/components/ui";

export function StepIndicator({ step, total = 2 }: { step: number; total?: number }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cx(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-accent" : "bg-sunken",
            )}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium text-muted">
        Paso {step} de {total}
      </span>
    </div>
  );
}
