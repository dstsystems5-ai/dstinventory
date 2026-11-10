"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PanelCard } from "@/components/ui/panel-card";
import { DataTable } from "@/components/ui/data-table";
import { TabBar } from "@/components/ui/tabs";
import { useFinance } from "@/lib/finance-context";
import { useOperations } from "@/lib/operations-context";
import { useOrganization } from "@/lib/organization-context";
import { formatMoney } from "@/lib/locale";
import { purchaseBalance } from "@/lib/finance-math";
import {
  DebtorAccountDetail,
  type DebtorPartyKind,
} from "@/components/finance/debtor-account-detail";

type AccountRow = {
  partyId: string;
  kind: DebtorPartyKind;
  name: string;
  balance: number;
  openCount: number;
  subtitle: string;
};

export function DebtorsManager() {
  const { purchases } = useFinance();
  const { distributions, distributionBalance } = useOperations();
  const { vendors, suppliers } = useOrganization();

  const [tab, setTab] = useState<"all" | DebtorPartyKind>("all");
  const [detailKind, setDetailKind] = useState<DebtorPartyKind | null>(null);
  const [detailPartyId, setDetailPartyId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const rows = useMemo(() => {
    const vendorMap = new Map<string, AccountRow>();
    for (const d of distributions) {
      const bal = distributionBalance(d);
      if (bal <= 0) continue;
      const v = vendors.find((x) => x.id === d.vendorShopId);
      const existing = vendorMap.get(d.vendorShopId);
      if (existing) {
        existing.balance += bal;
        existing.openCount += 1;
      } else {
        vendorMap.set(d.vendorShopId, {
          partyId: d.vendorShopId,
          kind: "vendor",
          name: v?.name ?? "Vendor",
          balance: bal,
          openCount: 1,
          subtitle: v?.region ?? "",
        });
      }
    }

    const supplierMap = new Map<string, AccountRow>();
    for (const p of purchases) {
      const bal = purchaseBalance(p);
      if (bal <= 0) continue;
      const s = suppliers.find((x) => x.id === p.supplierId);
      const existing = supplierMap.get(p.supplierId);
      if (existing) {
        existing.balance += bal;
        existing.openCount += 1;
      } else {
        supplierMap.set(p.supplierId, {
          partyId: p.supplierId,
          kind: "supplier",
          name: s?.name ?? "Supplier",
          balance: bal,
          openCount: 1,
          subtitle: "DST payable",
        });
      }
    }

    return [...vendorMap.values(), ...supplierMap.values()].sort(
      (a, b) => b.balance - a.balance,
    );
  }, [
    distributions,
    purchases,
    vendors,
    suppliers,
    distributionBalance,
  ]);

  const visible = rows.filter((r) => tab === "all" || r.kind === tab);

  const openAccount = (kind: DebtorPartyKind, partyId: string) => {
    setDetailKind(kind);
    setDetailPartyId(partyId);
    setDetailOpen(true);
  };

  const vendorTotal = rows
    .filter((r) => r.kind === "vendor")
    .reduce((s, r) => s + r.balance, 0);
  const supplierTotal = rows
    .filter((r) => r.kind === "supplier")
    .reduce((s, r) => s + r.balance, 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        tone="rose"
        title="Debtors & payables"
        description="Everyone who owes DST or whom DST owes — tap an account for documents, payment history, and new payments."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PanelCard tone="sky" title="Receivable (vendors owe DST)">
          <p className="text-2xl font-bold text-violet-900">
            {formatMoney(vendorTotal)}
          </p>
          <p className="text-xs text-slate-500">
            {rows.filter((r) => r.kind === "vendor").length} accounts with
            balance
          </p>
        </PanelCard>
        <PanelCard tone="amber" title="Payable (DST owes suppliers)">
          <p className="text-2xl font-bold text-amber-900">
            {formatMoney(supplierTotal)}
          </p>
          <p className="text-xs text-slate-500">
            {rows.filter((r) => r.kind === "supplier").length} suppliers with
            balance
          </p>
        </PanelCard>
      </div>

      <TabBar
        tone="rose"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        tabs={[
          { id: "all", label: "All", count: rows.length },
          {
            id: "vendor",
            label: "Debtors (vendors)",
            count: rows.filter((r) => r.kind === "vendor").length,
          },
          {
            id: "supplier",
            label: "Payables (suppliers)",
            count: rows.filter((r) => r.kind === "supplier").length,
          },
        ]}
      />

      <PanelCard tone="rose" title="Accounts" noPadding>
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          Tap a row for balances, invoices, and to add a payment with who
          recorded it.
        </p>
        <DataTable
          columns={["Account", "Type", "Open docs", "Balance", ""]}
          className="rounded-none border-0 shadow-none"
        >
          {visible.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                No outstanding balances.
              </td>
            </tr>
          ) : (
            visible.map((r) => (
              <tr
                key={`${r.kind}-${r.partyId}`}
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-rose-50/50"
                onClick={() => openAccount(r.kind, r.partyId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openAccount(r.kind, r.partyId);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  {r.subtitle ? (
                    <p className="text-xs text-slate-500">{r.subtitle}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.kind === "vendor" ? "Owes DST" : "DST owes"}
                </td>
                <td className="px-4 py-3">{r.openCount}</td>
                <td className="px-4 py-3 font-bold text-violet-900">
                  {formatMoney(r.balance)}
                </td>
                <td className="px-4 py-3 text-xs text-sky-700">View →</td>
              </tr>
            ))
          )}
        </DataTable>
      </PanelCard>

      <DebtorAccountDetail
        kind={detailKind}
        partyId={detailPartyId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailPartyId(null);
          setDetailKind(null);
        }}
      />
    </div>
  );
}
