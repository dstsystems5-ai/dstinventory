"use client";

import Link from "next/link";
import { PanelCard } from "@/components/ui/panel-card";

const steps = [
  {
    n: 1,
    title: "Main supplier",
    detail: "Purchase order",
    href: "/suppliers",
    abbr: "Su",
    tone: "from-sky-500 to-blue-600",
  },
  {
    n: 2,
    title: "Inbound @ DST",
    detail: "Scan & receive",
    href: "/inbound",
    abbr: "Ib",
    tone: "from-amber-500 to-orange-500",
  },
  {
    n: 3,
    title: "Hub stock",
    detail: "Commit to inventory",
    href: "/inventory",
    abbr: "In",
    tone: "from-slate-600 to-slate-800",
  },
  {
    n: 4,
    title: "Distribution",
    detail: "Batch to personnel",
    href: "/distribution",
    abbr: "Ds",
    tone: "from-violet-500 to-purple-600",
  },
  {
    n: 5,
    title: "Field agent",
    detail: "Responsible staff",
    href: "/personnel",
    abbr: "Ag",
    tone: "from-indigo-500 to-violet-600",
  },
  {
    n: 6,
    title: "Vendor shop",
    detail: "Deliver & discount",
    href: "/vendors",
    abbr: "Vn",
    tone: "from-teal-500 to-emerald-600",
  },
  {
    n: 7,
    title: "Receipt & cash",
    detail: "Payments in/out",
    href: "/cashflow",
    abbr: "Ca",
    tone: "from-emerald-500 to-teal-600",
  },
] as const;

const extras = [
  { label: "Scan (mobile)", href: "/scan" },
  { label: "Print receipts", href: "/receipts" },
  { label: "DST shop", href: "/shop" },
  { label: "QuickBooks", href: "/integrations" },
  { label: "Alerts", href: "/notifications" },
] as const;

export function SupplyChainFlow() {
  return (
    <PanelCard
      tone="sky"
      title="End-to-end stock process"
      description="From main supplier through DST hub, assigned personnel, vendor shops, and finance — tap any step to open that screen."
    >
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible">
        {steps.map((step, i) => (
          <li key={step.n} className="relative min-w-[118px] flex-1 lg:min-w-0">
            {i < steps.length - 1 ? (
              <span
                className="pointer-events-none absolute right-0 top-9 z-0 hidden translate-x-1/2 text-slate-300 lg:inline"
                aria-hidden
              >
                →
              </span>
            ) : null}
            <Link
              href={step.href}
              className="group relative z-10 flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition hover:border-sky-300 hover:bg-white hover:shadow-md"
            >
              <span
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${step.tone} text-[10px] font-bold text-white shadow`}
              >
                {step.abbr}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Step {step.n}
              </span>
              <span className="mt-0.5 text-sm font-bold text-slate-900 group-hover:text-sky-900">
                {step.title}
              </span>
              <span className="mt-1 text-xs text-slate-500">{step.detail}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-500">Also in the flow:</span>
        {extras.map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-800"
          >
            {x.label}
          </Link>
        ))}
      </div>
    </PanelCard>
  );
}
