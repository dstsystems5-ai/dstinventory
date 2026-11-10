import type { ModuleTone } from "@/lib/module-colors";
import { moduleToneStyles } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  tone = "amber",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: ModuleTone;
}) {
  const chip = moduleToneStyles[tone].chip;
  return (
    <header className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              chip,
            )}
          >
            DST Hardware
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-slate-200 via-amber-200/80 to-transparent" />
    </header>
  );
}
