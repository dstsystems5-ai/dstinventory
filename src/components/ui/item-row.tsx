import Link from "next/link";
import { formatMoney } from "@/lib/locale";
import { itemCategoryBadge } from "@/lib/item-icon";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemRow({
  item,
  href,
  showPrices = true,
  compact,
}: {
  item: Item;
  href?: string;
  showPrices?: boolean;
  compact?: boolean;
}) {
  const low = item.qtyOnHand <= item.reorderLevel;
  const badge = itemCategoryBadge(item.category, item.name);

  const inner = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
          badge.className,
        )}
        aria-hidden
      >
        {badge.abbr}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium text-slate-900",
            compact ? "text-sm" : "text-base",
          )}
          title={item.name}
        >
          {item.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          <span className="font-mono">{item.sku}</span>
          {item.category ? ` · ${item.category}` : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "tabular-nums font-semibold",
            low ? "text-amber-800" : "text-slate-900",
          )}
        >
          {item.qtyOnHand} {item.unit}
        </p>
        {showPrices ? (
          <p className="text-xs tabular-nums text-slate-500">{formatMoney(item.sellPrice)}</p>
        ) : null}
        {low ? (
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
            Low
          </p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors",
    href && "hover:border-amber-200 hover:bg-amber-50/30",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
