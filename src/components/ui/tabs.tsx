"use client";

import { cn } from "@/lib/utils";
import type { ModuleTone } from "@/lib/module-colors";
import { moduleToneStyles } from "@/lib/module-colors";

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  tone = "amber",
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  tone?: ModuleTone;
}) {
  const styles = moduleToneStyles[tone];
  return (
    <div
      className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur"
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
              active ? styles.tabActive : styles.tab,
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  active ? "bg-white/25" : "bg-slate-100 text-slate-600",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
