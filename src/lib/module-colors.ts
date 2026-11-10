export type ModuleTone =
  | "amber"
  | "emerald"
  | "sky"
  | "violet"
  | "rose"
  | "slate";

export const moduleToneStyles: Record<
  ModuleTone,
  { bar: string; tab: string; tabActive: string; chip: string; ring: string }
> = {
  amber: {
    bar: "bg-gradient-to-r from-amber-500 to-orange-500",
    tab: "text-amber-900/70 hover:bg-amber-50",
    tabActive: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25",
    chip: "bg-amber-100 text-amber-900",
    ring: "ring-amber-400/40",
  },
  emerald: {
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
    tab: "text-emerald-900/70 hover:bg-emerald-50",
    tabActive: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25",
    chip: "bg-emerald-100 text-emerald-900",
    ring: "ring-emerald-400/40",
  },
  sky: {
    bar: "bg-gradient-to-r from-sky-500 to-blue-500",
    tab: "text-sky-900/70 hover:bg-sky-50",
    tabActive: "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/25",
    chip: "bg-sky-100 text-sky-900",
    ring: "ring-sky-400/40",
  },
  violet: {
    bar: "bg-gradient-to-r from-violet-500 to-purple-500",
    tab: "text-violet-900/70 hover:bg-violet-50",
    tabActive: "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/25",
    chip: "bg-violet-100 text-violet-900",
    ring: "ring-violet-400/40",
  },
  rose: {
    bar: "bg-gradient-to-r from-rose-500 to-pink-500",
    tab: "text-rose-900/70 hover:bg-rose-50",
    tabActive: "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25",
    chip: "bg-rose-100 text-rose-900",
    ring: "ring-rose-400/40",
  },
  slate: {
    bar: "bg-gradient-to-r from-slate-600 to-slate-800",
    tab: "text-slate-600 hover:bg-slate-100",
    tabActive: "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md",
    chip: "bg-slate-100 text-slate-800",
    ring: "ring-slate-400/40",
  },
};
