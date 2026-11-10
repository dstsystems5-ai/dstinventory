"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFinance } from "@/lib/finance-context";
import { useOperations } from "@/lib/operations-context";
import { useOrganization } from "@/lib/organization-context";
import { buildDocumentTimeline, useLedger } from "@/lib/ledger-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { purchaseBalance } from "@/lib/finance-math";
import { staffDisplayName } from "@/lib/permissions";
import { paymentMethodLabel } from "@/lib/payment-labels";
import type { LedgerDocKind } from "@/lib/types";
import { SupplierInvoiceDetail } from "@/components/procurement/supplier-invoice-detail";
import { DistributionOrderDetail } from "@/components/distribution/distribution-order-detail";

type Props = {
  docKind: LedgerDocKind | null;
  docId: string | null;
  open: boolean;
  onClose: () => void;
};

export function InvoiceDocumentDetail({
  docKind,
  docId,
  open,
  onClose,
}: Props) {
  const { purchases, payments } = useFinance();
  const { distributions, distributionBalance } = useOperations();
  const { suppliers, vendors, staff } = useOrganization();
  const { events } = useLedger();

  const [fullSupplierOpen, setFullSupplierOpen] = useState(false);
  const [fullDistOpen, setFullDistOpen] = useState(false);

  const purchase =
    docKind === "supplier_invoice" && docId
      ? purchases.find((p) => p.id === docId)
      : null;
  const distribution =
    docKind === "vendor_distribution" && docId
      ? distributions.find((d) => d.id === docId)
      : null;

  const timeline = useMemo(() => {
    if (!docKind || !docId) return [];
    return buildDocumentTimeline(docKind, docId, events, payments);
  }, [docKind, docId, events, payments]);

  const title = useMemo(() => {
    if (purchase) {
      const s = suppliers.find((x) => x.id === purchase.supplierId);
      return `Supplier invoice · ${purchase.invoiceNumber ?? purchase.reference}${s ? ` · ${s.name}` : ""}`;
    }
    if (distribution) {
      const v = vendors.find((x) => x.id === distribution.vendorShopId);
      return `Vendor distribution · ${distribution.batchNumber}${v ? ` · ${v.name}` : ""}`;
    }
    return "Invoice";
  }, [purchase, distribution, suppliers, vendors]);

  const staffName = (id?: string) => {
    if (!id) return "—";
    const m = staff.find((s) => s.id === id);
    return m ? staffDisplayName(m) : "—";
  };

  const summary = purchase
    ? {
        total: purchase.totalCost,
        paid: purchase.amountPaid,
        balance: purchaseBalance(purchase),
        date: purchase.purchasedAt,
        status: purchase.amountPaid >= purchase.totalCost ? "completed" : "committed",
      }
    : distribution
      ? {
          total: distribution.totalDue,
          paid: distribution.amountPaid,
          balance: distributionBalance(distribution),
          date: distribution.createdAt,
          status: distribution.status,
        }
      : null;

  return (
    <>
      <Modal
        open={open && !fullSupplierOpen && !fullDistOpen}
        wide
        title={title}
        onClose={onClose}
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            {purchase ? (
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => setFullSupplierOpen(true)}
              >
                Open full supplier invoice
              </Button>
            ) : null}
            {distribution ? (
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => setFullDistOpen(true)}
              >
                Open distribution commitment
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        }
      >
        {!docKind || !docId || !summary ? (
          <p className="text-sm text-slate-600">Document not found.</p>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-slate-500">
              {docKind === "supplier_invoice"
                ? "Supplier purchase invoice"
                : "Vendor shop distribution commitment"}
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Total</dt>
                <dd className="font-semibold">{formatMoney(summary.total)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Paid / collected</dt>
                <dd>{formatMoney(summary.paid)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Balance</dt>
                <dd className="font-bold text-violet-900">
                  {formatMoney(summary.balance)}
                </dd>
              </div>
            </dl>
            <div className="flex items-center gap-2">
              <StatusBadge status={summary.status as "committed" | "completed"} />
              <span className="text-xs text-slate-500">
                {formatDate(summary.date)}
              </span>
            </div>

            <section>
              <h3 className="text-sm font-bold text-slate-900">
                History & changes
              </h3>
              {timeline.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No events yet — payments and edits will appear here.
                </p>
              ) : (
                <ol className="relative mt-4 space-y-0 border-l-2 border-slate-200 pl-4">
                  {timeline.map((row) => (
                    <li key={row.id} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500" />
                      <p className="text-sm font-medium text-slate-900">
                        {row.title}
                      </p>
                      {row.detail ? (
                        <p className="text-xs text-slate-600">{row.detail}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(row.occurredAt)}
                        {row.amount != null
                          ? ` · ${formatMoney(row.amount)}`
                          : ""}
                        {row.staffId
                          ? ` · Recorded by ${staffName(row.staffId)}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {purchase ? (
              <section className="text-sm text-slate-600">
                <p>
                  <strong>PO:</strong> {purchase.reference}
                </p>
                {purchase.notes ? (
                  <p className="mt-1">
                    <strong>Notes:</strong> {purchase.notes}
                  </p>
                ) : null}
              </section>
            ) : null}
            {distribution ? (
              <section className="text-sm text-slate-600">
                <p>
                  <strong>Payment terms:</strong> {distribution.paymentTerms}
                </p>
                <p className="mt-1">
                  <strong>Preferred:</strong>{" "}
                  {paymentMethodLabel(distribution.preferredPaymentMethod)}
                </p>
              </section>
            ) : null}
          </div>
        )}
      </Modal>

      <SupplierInvoiceDetail
        purchaseId={purchase?.id ?? null}
        open={fullSupplierOpen}
        onClose={() => setFullSupplierOpen(false)}
        initialTab={summary && summary.balance > 0 ? "pay" : "details"}
      />

      <DistributionOrderDetail
        orderId={distribution?.id ?? null}
        open={fullDistOpen}
        onClose={() => setFullDistOpen(false)}
        initialShowPay={Boolean(summary && summary.balance > 0)}
      />
    </>
  );
}
