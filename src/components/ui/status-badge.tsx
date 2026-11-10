import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/demo-data";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-900",
        tone === "danger" && "bg-red-100 text-red-800",
        tone === "default" && "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
