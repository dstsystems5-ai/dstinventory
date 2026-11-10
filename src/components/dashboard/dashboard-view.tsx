"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { TabBar } from "@/components/ui/tabs";
import { PanelCard } from "@/components/ui/panel-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useFinance } from "@/lib/finance-context";
import { useInventory } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";
import { APP_COUNTRY, APP_CURRENCY, formatMoney } from "@/lib/locale";
import { staffDisplayName, canManageOtherAdmins } from "@/lib/permissions";
import { purchaseBalance } from "@/lib/finance-math";
import { useOrganization } from "@/lib/organization-context";
import { useShop } from "@/lib/shop-context";
import { DashboardShopItems } from "@/components/dashboard/dashboard-shop-items";
import { DashboardItemAnalytics } from "@/components/dashboard/dashboard-item-analytics";
import { useOperations } from "@/lib/operations-context";
import { formatDate } from "@/lib/locale";
import { paymentMethodLabel } from "@/lib/payment-labels";
import { SupplyChainFlow } from "@/components/dashboard/supply-chain-flow";

type DashTab = "overview" | "money" | "operations";

export function DashboardView() {
  const { profitSummary, purchases } = useFinance();
  const { distributions, distributionBalance } = useOperations();
  const { items } = useInventory();
  const { suppliers, vendors } = useOrganization();
  const { shopStats, settings: shopSettings } = useShop();
  const { user } = useSession();
  const [tab, setTab] = useState<DashTab>("overview");

  const supplierDue = purchases.reduce((s, p) => s + purchaseBalance(p), 0);

  const supplierBalancesDue = useMemo(
    () =>
      purchases
        .map((p) => ({
          p,
          balance: purchaseBalance(p),
          supplier:
            suppliers.find((s) => s.id === p.supplierId)?.name ?? "Supplier",
        }))
        .filter((x) => x.balance > 0),
    [purchases, suppliers],
  );

  const vendorBalancesDue = useMemo(
    () =>
      distributions
        .map((d) => ({
          d,
          balance: distributionBalance(d),
          vendor: vendors.find((v) => v.id === d.vendorShopId)?.name ?? "Vendor",
        }))
        .filter((x) => x.balance > 0),
    [distributions, vendors, distributionBalance],
  );

  const isSuper = canManageOtherAdmins(user);

  return (
    <div className="dst-main-surface space-y-6 p-4 pb-24 sm:p-6 lg:pb-8">
      <header className="dst-animate-up overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-slate-900 to-violet-950 px-6 py-8 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
          {APP_COUNTRY} · {APP_CURRENCY}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {shopSettings.shopName} ·{" "}
          {isSuper
            ? `Super admin — ${staffDisplayName(user)}`
            : staffDisplayName(user)}
        </p>
        <p className="mt-1 text-xs text-emerald-200/80">
          Charts and circles reflect your live catalog, stock, and sales.
        </p>
      </header>

      <TabBar
        tone="amber"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Shop items", count: items.length },
          { id: "money", label: "Money" },
          { id: "operations", label: "Supply chain" },
        ]}
      />

      {tab === "overview" ? (
        <div className="space-y-6">
          <DashboardItemAnalytics />
          <DashboardShopItems />
        </div>
      ) : null}

      {tab === "money" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              tone="emerald"
              label="Money in"
              value={formatMoney(profitSummary.cashIn)}
            />
            <StatCard
              tone="rose"
              label="Money out"
              value={formatMoney(profitSummary.cashOut)}
            />
            <StatCard
              tone="amber"
              label="Net cash"
              value={formatMoney(
                profitSummary.cashIn - profitSummary.cashOut,
              )}
            />
            <StatCard
              tone="violet"
              label="Owed suppliers"
              value={formatMoney(supplierDue)}
            />
          </section>

          <PanelCard
            title="Balances due"
            description="Suppliers and vendor shops"
            tone="violet"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <h4 className="text-xs font-bold uppercase text-violet-800">
                Owed to suppliers
              </h4>
              <ul className="mt-2 space-y-2 text-sm lg:col-span-1">
                {supplierBalancesDue.length === 0 ? (
                  <li className="text-slate-500">No supplier balances.</li>
                ) : (
                  supplierBalancesDue.map(({ p, balance, supplier }) => (
                    <li
                      key={p.id}
                      className="flex justify-between rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2"
                    >
                      <span>
                        {supplier} · {p.invoiceNumber ?? p.reference}
                      </span>
                      <strong>{formatMoney(balance)}</strong>
                    </li>
                  ))
                )}
              </ul>
              <div>
                <h4 className="text-xs font-bold uppercase text-rose-800">
                  Vendor payments due
                </h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {vendorBalancesDue.length === 0 ? (
                    <li className="text-slate-500">No vendor balances.</li>
                  ) : (
                    vendorBalancesDue.map(({ d, balance, vendor }) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap justify-between gap-1 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2"
                      >
                        <span>
                          {vendor} · {d.batchNumber}
                        </span>
                        <span className="text-right">
                          <strong>{formatMoney(balance)}</strong>
                          <span className="block text-xs text-slate-500">
                            Due {formatDate(d.dueDate)} ·{" "}
                            {paymentMethodLabel(d.preferredPaymentMethod)}
                          </span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/cashflow"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
              >
                Cash flow
              </Link>
              <Link
                href="/debtors"
                className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900"
              >
                Debtors & payables
              </Link>
            </div>
          </PanelCard>

          <PanelCard title="Cash mix" description="Money in vs out" tone="emerald">
            <ProgressBar
              tone="emerald"
              label="Inflow share"
              value={profitSummary.cashIn}
              max={profitSummary.cashIn + profitSummary.cashOut || 1}
            />
          </PanelCard>
        </>
      ) : null}

      {tab === "operations" ? (
        <>
          <SupplyChainFlow />
          <PanelCard tone="sky" title="Quick modules" className="mt-4">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {[
                { href: "/suppliers", label: "Suppliers" },
                { href: "/inbound", label: "Inbound" },
                { href: "/distribution", label: "Distribution" },
                { href: "/shop", label: "Counter sales" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800 hover:bg-slate-50"
                  >
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </PanelCard>
        </>
      ) : null}
    </div>
  );
}
