import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  tone = "amber",
  label,
}: {
  value: number;
  max: number;
  tone?: "amber" | "emerald" | "rose" | "sky";
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill: Record<string, string> = {
    amber: "bg-gradient-to-r from-amber-400 to-orange-500",
    emerald: "bg-gradient-to-r from-emerald-400 to-teal-500",
    rose: "bg-gradient-to-r from-rose-400 to-red-500",
    sky: "bg-gradient-to-r from-sky-400 to-blue-500",
  };
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="tabular-nums font-medium text-slate-700">{pct}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", fill[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
