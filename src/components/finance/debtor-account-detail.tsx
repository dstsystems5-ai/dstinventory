"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-field";
import { useFinance } from "@/lib/finance-context";
import { useOperations } from "@/lib/operations-context";
import { useOrganization } from "@/lib/organization-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { purchaseBalance } from "@/lib/finance-math";
import { staffDisplayName } from "@/lib/permissions";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/payment-labels";
import { nextReference } from "@/lib/reference-numbers";
import type { PaymentMethod } from "@/lib/types";
import { SupplierInvoiceDetail } from "@/components/procurement/supplier-invoice-detail";
import { DistributionOrderDetail } from "@/components/distribution/distribution-order-detail";

export type DebtorPartyKind = "vendor" | "supplier";

type Props = {
  kind: DebtorPartyKind | null;
  partyId: string | null;
  open: boolean;
  onClose: () => void;
};

export function DebtorAccountDetail({ kind, partyId, open, onClose }: Props) {
  const { purchases, payPurchase, addPayment, payments } = useFinance();
  const { distributions, distributionBalance, payDistribution } =
    useOperations();
  const { vendors, suppliers, staff } = useOrganization();
  const { user } = useSession();

  const activeStaff = useMemo(
    () => staff.filter((m) => m.isActive),
    [staff],
  );

  const vendor =
    kind === "vendor" && partyId
      ? vendors.find((v) => v.id === partyId)
      : undefined;
  const supplier =
    kind === "supplier" && partyId
      ? suppliers.find((s) => s.id === partyId)
      : undefined;

  const openDocs = useMemo(() => {
    if (kind === "vendor" && partyId) {
      return distributions
        .filter((d) => d.vendorShopId === partyId)
        .map((d) => ({
          id: d.id,
          ref: d.batchNumber,
          total: d.totalDue,
          balance: distributionBalance(d),
          at: d.dueDate,
        }))
        .filter((x) => x.balance > 0)
        .sort(
          (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
        );
    }
    if (kind === "supplier" && partyId) {
      return purchases
        .filter((p) => p.supplierId === partyId)
        .map((p) => ({
          id: p.id,
          ref: p.invoiceNumber ?? p.reference,
          total: p.totalCost,
          balance: purchaseBalance(p),
          at: p.purchasedAt,
        }))
        .filter((x) => x.balance > 0)
        .sort(
          (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
        );
    }
    return [];
  }, [kind, partyId, distributions, purchases, distributionBalance]);

  const totalBalance = openDocs.reduce((s, d) => s + d.balance, 0);

  const partyPayments = useMemo(() => {
    if (!partyId || !kind) return [];
    return payments
      .filter((p) => {
        if (kind === "vendor") {
          return p.vendorShopId === partyId && p.direction === "in";
        }
        const purchase = purchases.find((pu) => pu.id === p.purchaseId);
        return (
          p.direction === "out" &&
          purchase?.supplierId === partyId
        );
      })
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, 25);
  }, [payments, partyId, kind, purchases]);

  const [targetDocId, setTargetDocId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mobile_money");
  const [payMemo, setPayMemo] = useState("");
  const [recordedBy, setRecordedBy] = useState(user.id);
  const [showPay, setShowPay] = useState(false);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [subDocId, setSubDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const first = openDocs[0]?.id ?? "";
    setTargetDocId(first);
    setPayAmount(openDocs[0]?.balance ?? 0);
    setRecordedBy(user.id);
    setShowPay(false);
    setPayMemo("");
  }, [open, openDocs, user.id]);

  useEffect(() => {
    const doc = openDocs.find((d) => d.id === targetDocId);
    if (doc) setPayAmount(doc.balance);
  }, [targetDocId, openDocs]);

  const staffName = (id?: string) => {
    if (!id) return "—";
    const m = staff.find((s) => s.id === id);
    return m ? staffDisplayName(m) : "—";
  };

  const title =
    kind === "vendor"
      ? vendor?.name ?? "Vendor debtor"
      : supplier?.name ?? "Supplier payable";

  const recordPayment = () => {
    if (!targetDocId || payAmount <= 0) return;
    if (kind === "supplier") {
      payPurchase(targetDocId, payAmount, {
        memo: payMemo.trim() || undefined,
        paymentMethod: payMethod,
        receivedByStaffId: recordedBy,
      });
    } else if (kind === "vendor") {
      const order = distributions.find((d) => d.id === targetDocId);
      if (!order || !vendor) return;
      const amount = Math.min(payAmount, distributionBalance(order));
      if (amount <= 0) return;
      const paymentId = crypto.randomUUID();
      payDistribution(order.id, amount, payMethod, {
        memo: payMemo.trim() || undefined,
        staffId: recordedBy,
        paymentId,
      });
      addPayment({
        id: paymentId,
        reference: nextReference("PAY"),
        direction: "in",
        amount,
        category: "Vendor collection",
        memo: payMemo.trim() || `${order.batchNumber} · ${vendor.name}`,
        occurredAt: new Date().toISOString(),
        vendorShopId: order.vendorShopId,
        distributionOrderId: order.id,
        paymentMethod: payMethod,
        receivedByStaffId: recordedBy,
      });
    }
    setShowPay(false);
    setPayMemo("");
  };

  const openSubDoc = (id: string) => {
    setSubDocId(id);
    if (kind === "supplier") setInvoiceOpen(true);
    else setDistOpen(true);
  };

  return (
    <>
      <Modal
        open={open && !invoiceOpen && !distOpen}
        wide
        title={title}
        onClose={onClose}
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        {!kind || !partyId ? (
          <p className="text-sm text-slate-600">Account not found.</p>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-slate-500">
              {kind === "vendor"
                ? "Vendor shop · owes DST (receivable)"
                : "Supplier · DST owes (payable)"}
            </p>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Outstanding balance</dt>
                <dd className="text-xl font-bold text-violet-900">
                  {formatMoney(totalBalance)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Open documents</dt>
                <dd className="font-medium">{openDocs.length}</dd>
              </div>
              {vendor ? (
                <>
                  <div>
                    <dt className="text-xs text-slate-500">Contact</dt>
                    <dd>
                      {vendor.contactName || "—"}
                      {vendor.phone ? ` · ${vendor.phone}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Region</dt>
                    <dd>{vendor.region || "—"}</dd>
                  </div>
                </>
              ) : null}
              {supplier ? (
                <>
                  <div>
                    <dt className="text-xs text-slate-500">Contact</dt>
                    <dd>
                      {supplier.contactName || "—"}
                      {supplier.phone ? ` · ${supplier.phone}` : ""}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>

            <section>
              <h3 className="text-sm font-bold text-slate-900">
                Open invoices / commitments
              </h3>
              {openDocs.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Nothing due.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {openDocs.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <button
                        type="button"
                        className="text-left font-medium text-sky-800 underline-offset-2 hover:underline"
                        onClick={() => openSubDoc(d.id)}
                      >
                        {d.ref}
                      </button>
                      <span>
                        Balance <strong>{formatMoney(d.balance)}</strong>
                        <span className="ml-2 text-xs text-slate-500">
                          {formatDate(d.at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {totalBalance > 0 ? (
              <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                <PaySectionHeader
                  showPay={showPay}
                  setShowPay={setShowPay}
                  kind={kind}
                />
                {showPay ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <FormField label="Apply to document">
                      <select
                        className={inputClass}
                        value={targetDocId}
                        onChange={(e) => setTargetDocId(e.target.value)}
                      >
                        {openDocs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.ref} · {formatMoney(d.balance)} due
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Amount">
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={payAmount}
                        onChange={(e) => setPayAmount(Number(e.target.value))}
                      />
                    </FormField>
                    <FormField label="Payment method">
                      <select
                        className={inputClass}
                        value={payMethod}
                        onChange={(e) =>
                          setPayMethod(e.target.value as PaymentMethod)
                        }
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {paymentMethodLabel(m)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Recorded by">
                      <select
                        className={inputClass}
                        value={recordedBy}
                        onChange={(e) => setRecordedBy(e.target.value)}
                      >
                        {activeStaff.map((m) => (
                          <option key={m.id} value={m.id}>
                            {staffDisplayName(m)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Memo" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        value={payMemo}
                        onChange={(e) => setPayMemo(e.target.value)}
                      />
                    </FormField>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => setShowPay(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={recordPayment}
                        disabled={payAmount <= 0 || !targetDocId}
                      >
                        Save payment
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section>
              <h3 className="text-sm font-bold text-slate-900">
                Recent payments
              </h3>
              {partyPayments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">None yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {partyPayments.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <p className="font-mono text-xs text-slate-500">
                        {p.reference}
                      </p>
                      <p className="font-semibold">
                        {formatMoney(p.amount)}
                        {p.paymentMethod
                          ? ` · ${paymentMethodLabel(p.paymentMethod)}`
                          : ""}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatDate(p.occurredAt)} · Recorded by{" "}
                        <strong>{staffName(p.receivedByStaffId)}</strong>
                        {p.memo ? ` · ${p.memo}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>

      <SupplierInvoiceDetail
        purchaseId={subDocId}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setSubDocId(null);
        }}
        initialTab="pay"
      />

      <DistributionOrderDetail
        orderId={subDocId}
        open={distOpen}
        onClose={() => {
          setDistOpen(false);
          setSubDocId(null);
        }}
        initialShowPay
      />
    </>
  );
}

function PaySectionHeader({
  showPay,
  setShowPay,
  kind,
}: {
  showPay: boolean;
  setShowPay: (v: boolean) => void;
  kind: DebtorPartyKind;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">
        {kind === "vendor" ? "Record collection" : "Record supplier payment"}
      </h3>
      {!showPay ? (
        <Button
          variant="secondary"
          className="text-xs"
          onClick={() => setShowPay(true)}
        >
          Add payment
        </Button>
      ) : null}
    </div>
  );
}
