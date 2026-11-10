"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useInventory } from "@/lib/inventory-context";
import { useShop } from "@/lib/shop-context";
import { useFinance } from "@/lib/finance-context";
import { purchaseBalance } from "@/lib/finance-math";
import { formatMoney } from "@/lib/locale";
import { shopUnitPrice } from "@/lib/shop-context";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#06b6d4",
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function AnimatedDonut({
  segments,
  size = 112,
  center,
  className,
}: {
  segments: { pct: number; color: string }[];
  size?: number;
  center: React.ReactNode;
  className?: string;
}) {
  let cursor = 0;
  const stops = segments
    .filter((s) => s.pct > 0)
    .map((s) => {
      const start = cursor;
      cursor += s.pct;
      return `${s.color} ${start * 3.6}deg ${cursor * 3.6}deg`;
    });
  const bg =
    stops.length > 0
      ? `conic-gradient(${stops.join(", ")}, #e2e8f0 ${cursor * 3.6}deg)`
      : "conic-gradient(#e2e8f0 0deg)";

  return (
    <div
      className={cn("relative dst-animate-donut", className)}
      style={{ width: size, height: size }}
    >
      <div className="h-full w-full rounded-full" style={{ background: bg }} />
      <div
        className="absolute inset-0 m-auto flex items-center justify-center rounded-full bg-white shadow-inner"
        style={{ width: size * 0.68, height: size * 0.68 }}
      >
        {center}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  gradient,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  gradient: string;
  delay: number;
}) {
  return (
    <article
      className="dst-animate-up overflow-hidden rounded-2xl border border-white/40 p-4 text-white shadow-lg"
      style={{
        animationDelay: `${delay}ms`,
        background: gradient,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-white/75">{sub}</p>
    </article>
  );
}

function MixSegment({ widthPct, color }: { widthPct: number; color: string }) {
  if (widthPct <= 0) return null;
  return (
    <div
      className="dst-animate-bar h-full"
      style={{ width: `${widthPct}%`, backgroundColor: color }}
    />
  );
}

export function DashboardItemAnalytics() {
  const { items } = useInventory();
  const { shopStats, sales, settings } = useShop();
  const { purchases } = useFinance();

  const inShop = items.filter((i) => i.showInShop !== false).length;
  const hidden = items.length - inShop;
  const outCount = items.filter((i) => i.qtyOnHand <= 0).length;
  const lowCount = items.filter(
    (i) => i.qtyOnHand > 0 && i.qtyOnHand <= i.reorderLevel,
  ).length;
  const okCount = items.length - outCount - lowCount;

  const stockValue = items.reduce(
    (s, i) => s + i.qtyOnHand * i.costPrice,
    0,
  );
  const retailValue = items.reduce(
    (s, i) => s + i.qtyOnHand * shopUnitPrice(i),
    0,
  );
  const supplierDue = purchases.reduce((s, p) => s + purchaseBalance(p), 0);
  const pool = stockValue + Math.max(0, retailValue - stockValue) + supplierDue || 1;

  const categoryBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(
        item.category,
        (map.get(item.category) ?? 0) + item.qtyOnHand * shopUnitPrice(item),
      );
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([name, value], i) => ({
      name,
      value,
      pct: (value / max) * 100,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [items]);

  const topStock = useMemo(
    () =>
      [...items]
        .map((i) => ({
          name: i.name,
          value: i.qtyOnHand * shopUnitPrice(i),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [items],
  );

  const maxTop = topStock[0]?.value ?? 1;

  const alertItems = useMemo(
    () =>
      items
        .filter((i) => i.qtyOnHand <= i.reorderLevel)
        .sort((a, b) => a.qtyOnHand - b.qtyOnHand)
        .slice(0, 5),
    [items],
  );

  const last7Sales = useMemo(() => {
    if (typeof window === "undefined") {
      return Array.from({ length: 7 }, () => 0);
    }
    const counts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      counts.push(
        sales
          .filter((s) => {
            const t = new Date(s.soldAt).getTime();
            return t >= d.getTime() && t < next.getTime();
          })
          .reduce((sum, s) => sum + s.amountPaid, 0),
      );
    }
    return counts;
  }, [sales]);

  const maxSaleBar = Math.max(...last7Sales, 1);
  const weekTotal = last7Sales.reduce((a, b) => a + b, 0);

  const dayIndex =
    typeof window === "undefined"
      ? 0
      : new Date().getDay();

  const healthSegments = useMemo(() => {
    const total = items.length || 1;
    return [
      { pct: (okCount / total) * 100, color: "#10b981" },
      { pct: (lowCount / total) * 100, color: "#f59e0b" },
      { pct: (outCount / total) * 100, color: "#f43f5e" },
    ];
  }, [items.length, okCount, lowCount, outCount]);

  const shopSegments = useMemo(() => {
    const total = items.length || 1;
    return [
      { pct: (inShop / total) * 100, color: "#3b82f6" },
      { pct: (hidden / total) * 100, color: "#94a3b8" },
    ];
  }, [items.length, inShop, hidden]);

  return (
    <section className="space-y-4">
      {alertItems.length > 0 ? (
        <div
          className={cn(
            "dst-animate-up flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 px-4 py-3 text-sm text-white shadow-xl",
            outCount > 0 && "dst-pulse-alert",
          )}
        >
          <p>
            <strong>{alertItems[0].name}</strong>
            {alertItems[0].qtyOnHand <= 0 ? " is out of stock" : " is low"}
            {alertItems.length > 1 ? (
              <span className="text-rose-200">
                {" "}
                · +{alertItems.length - 1} need attention
              </span>
            ) : null}
          </p>
          <Link
            href="/shop"
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur hover:bg-white/25"
          >
            Sell / restock →
          </Link>
        </div>
      ) : null}

      <div className="dst-animate-up flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm backdrop-blur">
        <span className="font-semibold text-slate-800">
          Today · {formatMoney(shopStats.revenueToday)}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-emerald-700">
          {shopStats.salesCount} sales · {formatMoney(shopStats.profitToday)}{" "}
          margin
        </span>
        <span className="ml-auto text-xs text-slate-500">{settings.shopName}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Retail on shelf"
          value={formatMoney(retailValue)}
          sub={`${inShop} products visible`}
          gradient="linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
          delay={0}
        />
        <KpiCard
          label="Stock (cost)"
          value={formatMoney(stockValue)}
          sub={`${items.length} SKUs`}
          gradient="linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)"
          delay={80}
        />
        <KpiCard
          label="Potential margin"
          value={formatMoney(Math.max(0, retailValue - stockValue))}
          sub="Sell − cost on hand"
          gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fbbf24 100%)"
          delay={160}
        />
        <KpiCard
          label="Payables"
          value={formatMoney(supplierDue)}
          sub="Supplier balance"
          gradient="linear-gradient(135deg, #6d28d9 0%, #8b5cf6 55%, #a78bfa 100%)"
          delay={240}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <article className="dst-animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <h2 className="text-sm font-bold text-slate-900">Shop sales</h2>
          <p className="text-xs text-slate-500">Last 7 days</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {formatMoney(weekTotal)}
          </p>
          <div className="mt-4 flex h-36 items-end gap-2">
            {last7Sales.map((amt, i) => (
              <div
                key={`bar-${i}`}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="dst-animate-bar w-full max-w-11 rounded-t-lg bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-sm"
                  style={{
                    height: `${Math.max(12, (amt / maxSaleBar) * 100)}%`,
                    animationDelay: `${i * 70}ms`,
                  }}
                  title={formatMoney(amt)}
                />
                <span className="text-[9px] font-medium text-slate-500">
                  {WEEKDAY_LABELS[(dayIndex - (6 - i) + 7) % 7]}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="dst-animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Stock health
              </p>
              <div className="mt-3 flex items-center gap-4">
                <AnimatedDonut
                  segments={healthSegments}
                  center={
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {items.length}
                      </p>
                      <p className="text-[9px] uppercase text-slate-500">
                        items
                      </p>
                    </div>
                  }
                />
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    OK · {okCount}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Low · {lowCount}
                  </li>
                  <li
                    className={cn(
                      "flex items-center gap-2",
                      outCount > 0 && "font-semibold text-rose-700",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Out · {outCount}
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                In shop vs hidden
              </p>
              <div className="mt-3 flex items-center gap-4">
                <AnimatedDonut
                  segments={shopSegments}
                  center={
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {Math.round((inShop / (items.length || 1)) * 100)}%
                      </p>
                      <p className="text-[9px] uppercase text-slate-500">
                        on floor
                      </p>
                    </div>
                  }
                />
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li>In shop · {inShop}</li>
                  <li>Hidden · {hidden}</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Value mix
          </p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">
            <MixSegment
              widthPct={(stockValue / pool) * 100}
              color="#3b82f6"
            />
            <MixSegment
              widthPct={(Math.max(0, retailValue - stockValue) / pool) * 100}
              color="#10b981"
            />
            <MixSegment widthPct={(supplierDue / pool) * 100} color="#f59e0b" />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600">
            <span>
              <span className="text-blue-600">●</span> Stock{" "}
              {Math.round((stockValue / pool) * 100)}%
            </span>
            <span>
              <span className="text-emerald-600">●</span> Margin{" "}
              {Math.round((Math.max(0, retailValue - stockValue) / pool) * 100)}%
            </span>
            <span>
              <span className="text-amber-600">●</span> Due{" "}
              {Math.round((supplierDue / pool) * 100)}%
            </span>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="dst-animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">By category</h2>
          <p className="text-xs text-slate-500">Retail value on hand</p>
          <ul className="mt-4 space-y-3">
            {categoryBars.map((row, i) => (
              <li key={row.name}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{row.name}</span>
                  <span className="text-slate-500">{formatMoney(row.value)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="dst-animate-bar h-full rounded-full"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: row.color,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="dst-animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Top shelf value</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {topStock.map((row, i) => (
              <li key={row.name} className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{row.name}</span>
                  <strong className="shrink-0 text-emerald-800">
                    {formatMoney(row.value)}
                  </strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="dst-animate-bar h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                    style={{
                      width: `${(row.value / maxTop) * 100}%`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="dst-animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Needs a look</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alertItems.length === 0 ? (
              <li className="text-slate-500">All items look healthy.</li>
            ) : (
              alertItems.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
                    item.qtyOnHand <= 0
                      ? "border-rose-200 bg-rose-50/80"
                      : "border-amber-200 bg-amber-50/80",
                  )}
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      item.qtyOnHand <= 0
                        ? "bg-rose-600 text-white"
                        : "bg-amber-500 text-white",
                    )}
                  >
                    {item.qtyOnHand <= 0 ? "Out" : "Low"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
