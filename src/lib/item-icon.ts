/** Two-letter badge + colors for product rows (dashboard, lists). */
export function itemCategoryBadge(category: string, name?: string): {
  abbr: string;
  className: string;
} {
  const c = category.toLowerCase();
  const n = (name ?? "").toLowerCase();

  if (c.includes("elect") || n.includes("circuit") || n.includes("breaker")) {
    return { abbr: "El", className: "bg-sky-100 text-sky-800" };
  }
  if (c.includes("plumb") || n.includes("pipe") || n.includes("pvc")) {
    return { abbr: "Pl", className: "bg-teal-100 text-teal-800" };
  }
  if (c.includes("hand") || n.includes("hammer") || n.includes("wrench")) {
    return { abbr: "To", className: "bg-amber-100 text-amber-900" };
  }
  if (c.includes("paint") || c.includes("finish")) {
    return { abbr: "Pn", className: "bg-violet-100 text-violet-800" };
  }
  return { abbr: "Hw", className: "bg-slate-100 text-slate-700" };
}
