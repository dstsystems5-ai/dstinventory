"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatMoney } from "@/lib/locale";
import { useShop } from "@/lib/shop-context";
import { useFinance } from "@/lib/finance-context";
import { useInventory } from "@/lib/inventory-context";
import { purchaseBalance } from "@/lib/finance-math";

function DonutSegment({
  label,
  pct,
  value,
  color,
}: {
  label: string;
  pct: number;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)`,
        }}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-800">
          {Math.round(pct)}%
        </span>
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-900">{formatMoney(value)}</p>
    </div>
  );
}

export function ShopOverview() {
  const { settings, sales, shopStats } = useShop();
  const { profitSummary, purchases } = useFinance();
  const { items } = useInventory();

  const supplierDue = purchases.reduce((s, p) => s + purchaseBalance(p), 0);
  const cashOnHand = profitSummary.cashIn - profitSummary.cashOut;
  const stockValue = items.reduce(
    (s, i) => s + i.qtyOnHand * i.costPrice,
    0,
  );
  const dueTotal = supplierDue;
  const pool = cashOnHand + stockValue + dueTotal || 1;

  const alertItems = useMemo(
    () =>
      items
        .filter((i) => i.showInShop !== false)
        .filter((i) => i.qtyOnHand <= 0 || i.qtyOnHand <= i.reorderLevel)
        .slice(0, 4),
    [items],
  );

  const last7Days = useMemo(() => {
    if (typeof window === "undefined") {
      return Array.from({ length: 7 }, (_, i) => ({
        label: ["M", "T", "W", "T", "F", "S", "S"][i],
        revenue: 0,
      }));
    }
    const days: { label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const revenue = sales
        .filter((s) => {
          const t = new Date(s.soldAt).getTime();
          return t >= d.getTime() && t < next.getTime();
        })
        .reduce((sum, s) => sum + s.amountPaid, 0);
      days.push({
        label: d.toLocaleDateString("en-UG", { weekday: "short" }),
        revenue,
      });
    }
    return days;
  }, [sales]);

  const maxBar = Math.max(...last7Days.map((d) => d.revenue), 1);

  const categoryMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of sales) {
      for (const line of sale.lines) {
        const cat =
          items.find((i) => i.id === line.itemId)?.category ?? "Other";
        map.set(cat, (map.get(cat) ?? 0) + line.qty * line.unitPrice);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [sales, items]);

  const bestMargin = useMemo(() => {
    const map = new Map<string, { name: string; profit: number }>();
    for (const sale of sales) {
      for (const line of sale.lines) {
        const item = items.find((i) => i.id === line.itemId);
        const name = item?.name ?? line.itemId;
        const profit = line.qty * (line.unitPrice - line.unitCost);
        const prev = map.get(line.itemId);
        map.set(line.itemId, {
          name,
          profit: (prev?.profit ?? 0) + profit,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [sales, items]);

  const totalRevenue = sales.reduce((s, x) => s + x.amountPaid, 0);
  const totalProfit = sales.reduce(
    (s, sale) =>
      s +
      sale.lines.reduce(
        (sum, l) => sum + l.qty * (l.unitPrice - l.unitCost),
        0,
      ),
    0,
  );

  const todayLabel =
    typeof window === "undefined"
      ? "OVERVIEW"
      : new Date()
          .toLocaleDateString("en-UG", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })
          .toUpperCase();

  return (
    <Box className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-500">
            {todayLabel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {settings.shopName}
          </h1>
          <p className="text-sm text-slate-500">{settings.tagline}</p>
        </div>
        <Link
          href="/debtors"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
        >
          To pay {formatMoney(supplierDue)}
        </Link>
      </div>

      {alertItems.length > 0 ? (
        <Box className="rounded-xl bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <span className="font-semibold">{alertItems[0].name}</span>
          {alertItems[0].qtyOnHand <= 0 ? " is out" : " is low"}
          {alertItems.length > 1 ? (
            <span className="text-rose-200"> · +{alertItems.length - 1} more</span>
          ) : null}
        </Box>
      ) : null}

      <Box className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span>
          <strong>Today</strong> {formatMoney(shopStats.revenueToday)}{" "}
          <span className="text-slate-500">
            · {shopStats.salesCount} sales
          </span>
        </span>
        <span className="text-emerald-700">
          <strong>{formatMoney(shopStats.profitToday)}</strong> net today
        </span>
      </Box>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Revenue",
            value: formatMoney(totalRevenue),
            sub: "All shop sales",
            tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
          },
          {
            label: "Net",
            value: formatMoney(totalProfit),
            sub: "Gross margin",
            tone: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
          },
          {
            label: "Cash",
            value: formatMoney(cashOnHand),
            sub: "On hand (ledger)",
            tone: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
          },
          {
            label: "Due",
            value: formatMoney(dueTotal),
            sub: "Suppliers",
            tone: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
          },
        ].map((k) => (
          <article
            key={k.label}
            className={`rounded-2xl border p-4 shadow-sm ${k.tone}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {k.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{k.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{k.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Shop revenue</h2>
          <p className="text-xs text-slate-500">Last 7 days</p>
          <h3 className="mt-2 text-2xl font-bold text-emerald-800">
            {formatMoney(last7Days.reduce((s, d) => s + d.revenue, 0))}
          </h3>
          <Box className="mt-4 flex h-32 items-end gap-2">
            {last7Days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <Box
                  className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                  style={{
                    height: `${Math.max(8, (d.revenue / maxBar) * 100)}%`,
                  }}
                />
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </Box>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Balances</h2>
          <Box className="mt-4 flex justify-around gap-2">
            <DonutSegment
              label="Cash"
              pct={(cashOnHand / pool) * 100}
              value={cashOnHand}
              color="#10b981"
            />
            <DonutSegment
              label="Stock"
              pct={(stockValue / pool) * 100}
              value={stockValue}
              color="#3b82f6"
            />
            <DonutSegment
              label="Due"
              pct={(dueTotal / pool) * 100}
              value={dueTotal}
              color="#f59e0b"
            />
          </Box>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Sales mix</h2>
          {categoryMix.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No sales yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {categoryMix.map(([cat, amt]) => (
                <li key={cat} className="flex justify-between gap-2">
                  <span className="text-slate-700">{cat}</span>
                  <strong>{formatMoney(amt)}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Best margin</h2>
          {bestMargin.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No sales yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {bestMargin.map((row) => (
                <li key={row.name} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{row.name}</span>
                  <strong className="text-emerald-800">
                    {formatMoney(row.profit)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Needs a look</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alertItems.length === 0 ? (
              <li className="text-slate-500">Stock looks healthy.</li>
            ) : (
              alertItems.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5"
                >
                  <span className="truncate">{i.name}</span>
                  <span
                    className={
                      i.qtyOnHand <= 0
                        ? "shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800"
                        : "shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900"
                    }
                  >
                    {i.qtyOnHand <= 0 ? "Out" : "Low"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </Box>
  );
}

function Box({
  className,
  children,
  style,
}: {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
