import { cn } from "@/lib/utils";
import type { ModuleTone } from "@/lib/module-colors";
import { moduleToneStyles } from "@/lib/module-colors";

export function StatCard({
  label,
  value,
  hint,
  tone = "amber",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: ModuleTone;
  className?: string;
}) {
  const bar = moduleToneStyles[tone].bar;
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", bar)} />
      <p className="pl-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 pl-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 pl-2 text-xs text-slate-500">{hint}</p>
      ) : null}
    </article>
  );
}
