import { cn } from "@/lib/utils";
import type { ModuleTone } from "@/lib/module-colors";
import { moduleToneStyles } from "@/lib/module-colors";

export function PanelCard({
  title,
  description,
  tone = "amber",
  action,
  children,
  className,
  noPadding,
}: {
  title?: string;
  description?: string;
  tone?: ModuleTone;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  const bar = moduleToneStyles[tone].bar;
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm",
        className,
      )}
    >
      <div className={cn("h-1.5 w-full", bar)} />
      {title || description || action ? (
        <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={noPadding ? undefined : "p-5"}>{children}</div>
    </article>
  );
}
