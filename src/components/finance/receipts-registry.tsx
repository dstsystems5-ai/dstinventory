"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PanelCard } from "@/components/ui/panel-card";
import { DataTable } from "@/components/ui/data-table";
import { TabBar } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFinance } from "@/lib/finance-context";
import { useOperations } from "@/lib/operations-context";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { purchaseBalance } from "@/lib/finance-math";
import type { LedgerDocKind } from "@/lib/types";
import { InvoiceDocumentDetail } from "@/components/finance/invoice-document-detail";

type InvoiceRow = {
  id: string;
  kind: LedgerDocKind;
  reference: string;
  party: string;
  total: number;
  paid: number;
  balance: number;
  at: string;
  status: string;
};

export function ReceiptsRegistry() {
  const { purchases } = useFinance();
  const { distributions, distributionBalance } = useOperations();
  const { suppliers, vendors } = useOrganization();

  const [filter, setFilter] = useState<"all" | LedgerDocKind>("all");
  const [detailKind, setDetailKind] = useState<LedgerDocKind | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const rows = useMemo(() => {
    const supplierRows: InvoiceRow[] = purchases.map((p) => ({
      id: p.id,
      kind: "supplier_invoice",
      reference: p.invoiceNumber ?? p.reference,
      party: suppliers.find((s) => s.id === p.supplierId)?.name ?? "Supplier",
      total: p.totalCost,
      paid: p.amountPaid,
      balance: purchaseBalance(p),
      at: p.purchasedAt,
      status:
        p.amountPaid >= p.totalCost - 0.01 ? "completed" : "committed",
    }));
    const vendorRows: InvoiceRow[] = distributions.map((d) => ({
      id: d.id,
      kind: "vendor_distribution",
      reference: d.batchNumber,
      party: vendors.find((v) => v.id === d.vendorShopId)?.name ?? "Vendor",
      total: d.totalDue,
      paid: d.amountPaid,
      balance: distributionBalance(d),
      at: d.createdAt,
      status: d.status,
    }));
  return [...supplierRows, ...vendorRows].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [
    purchases,
    distributions,
    suppliers,
    vendors,
    distributionBalance,
  ]);

  const visible = rows.filter((r) => filter === "all" || r.kind === filter);

  const openDoc = (kind: LedgerDocKind, id: string) => {
    setDetailKind(kind);
    setDetailId(id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        tone="emerald"
        title="Receipts & invoices"
        description="Every supplier invoice and vendor distribution commitment, with payment history and edits."
      />

      <TabBar
        tone="emerald"
        value={filter}
        onChange={(v) => setFilter(v as typeof filter)}
        tabs={[
          { id: "all", label: "All", count: rows.length },
          {
            id: "supplier_invoice",
            label: "Supplier invoices",
            count: rows.filter((r) => r.kind === "supplier_invoice").length,
          },
          {
            id: "vendor_distribution",
            label: "Vendor distributions",
            count: rows.filter((r) => r.kind === "vendor_distribution").length,
          },
        ]}
      />

      <PanelCard tone="emerald" title="Invoice register" noPadding>
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          Tap a row to see progressive changes, payments, and who recorded each
          step.
        </p>
        <DataTable
          columns={[
            "Reference",
            "Type",
            "Party",
            "Total",
            "Balance",
            "Date",
            "Status",
          ]}
          className="rounded-none border-0 shadow-none"
        >
          {visible.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                No invoices yet. Create supplier invoices or distributions
                first.
              </td>
            </tr>
          ) : (
            visible.map((r) => (
              <tr
                key={`${r.kind}-${r.id}`}
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-emerald-50/60"
                onClick={() => openDoc(r.kind, r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDoc(r.kind, r.id);
                  }
                }}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">
                  {r.reference}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {r.kind === "supplier_invoice" ? "Supplier" : "Vendor dist."}
                </td>
                <td className="px-4 py-3">{r.party}</td>
                <td className="px-4 py-3">{formatMoney(r.total)}</td>
                <td className="px-4 py-3 font-medium text-violet-800">
                  {formatMoney(r.balance)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(r.at)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={r.status as "committed" | "completed" | "draft"}
                  />
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </PanelCard>

      <InvoiceDocumentDetail
        docKind={detailKind}
        docId={detailId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
          setDetailKind(null);
        }}
      />
    </div>
  );
}
