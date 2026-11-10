"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/finance-context";
import { useInventory } from "@/lib/inventory-context";
import { useOrganization } from "@/lib/organization-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { purchaseBalance } from "@/lib/finance-math";
import { staffDisplayName } from "@/lib/permissions";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/payment-labels";
import { SupplierPurchasePrintActions } from "@/components/procurement/supplier-purchase-print-actions";
import type { PaymentMethod, PurchaseLine, PurchaseRecord } from "@/lib/types";

type Props = {
  purchaseId: string | null;
  /** Right after save, pass the record until finance state re-renders. */
  fallbackPurchase?: PurchaseRecord | null;
  open: boolean;
  onClose: () => void;
  initialTab?: "details" | "pay";
};

export function SupplierInvoiceDetail({
  purchaseId,
  fallbackPurchase,
  open,
  onClose,
  initialTab = "details",
}: Props) {
  const {
    purchases,
    paymentsForPurchase,
    updatePurchase,
    payPurchase,
  } = useFinance();
  const { items } = useInventory();
  const { suppliers, staff } = useOrganization();
  const { user } = useSession();

  const purchase =
    purchases.find((p) => p.id === purchaseId) ??
    (fallbackPurchase?.id === purchaseId ? fallbackPurchase : null);
  const payments = purchase ? paymentsForPurchase(purchase.id) : [];
  const balance = purchase ? purchaseBalance(purchase) : 0;
  const hasPayments = payments.length > 0;

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");
  const [view, setView] = useState<"supplier" | "internal">("supplier");

  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mobile_money");
  const [payMemo, setPayMemo] = useState("");
  const [receivedByStaffId, setReceivedByStaffId] = useState(user.id);
  const [showPayForm, setShowPayForm] = useState(initialTab === "pay");

  const activeStaff = useMemo(
    () => staff.filter((m) => m.isActive),
    [staff],
  );

  useEffect(() => {
    if (!purchase || !open) return;
    setInvoiceNumber(purchase.invoiceNumber ?? "");
    setNotes(purchase.notes ?? "");
    setLines(purchase.lines.map((l) => ({ ...l })));
    setSaveError("");
    setPayAmount(balance > 0 ? balance : 0);
    setReceivedByStaffId(user.id);
    const wantPay = initialTab === "pay" && balance > 0;
    setShowPayForm(wantPay);
    setView(wantPay ? "internal" : "supplier");
    setSaveOk("");
  }, [purchase, open, balance, initialTab, user.id]);

  const supplier = suppliers.find((s) => s.id === purchase?.supplierId);
  const supplierName = supplier?.name ?? "—";

  const itemNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of items) map[i.id] = i.name;
    return map;
  }, [items]);

  const saveDetails = () => {
    if (!purchase) return;
    const ok = updatePurchase(
      purchase.id,
      {
        invoiceNumber: invoiceNumber.trim(),
        notes: notes.trim(),
        lines: hasPayments ? undefined : lines,
      },
      { staffId: user.id },
    );
    if (!ok) {
      setSaveError(
        "Could not save — invoice total cannot be less than what is already paid.",
      );
      setSaveOk("");
      return;
    }
    setSaveError("");
    setSaveOk("Invoice details saved.");
  };

  const recordPayment = () => {
    if (!purchase || payAmount <= 0) return;
    payPurchase(purchase.id, payAmount, {
      memo: payMemo.trim() || undefined,
      paymentMethod: payMethod,
      receivedByStaffId,
    });
    setPayMemo("");
  };

  const staffName = (id?: string) => {
    if (!id) return "—";
    const m = staff.find((s) => s.id === id);
    return m ? staffDisplayName(m) : "—";
  };

  return (
    <Modal
      open={open}
      wide
      title={purchase ? `Invoice ${purchase.invoiceNumber ?? purchase.reference}` : "Invoice"}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {purchase ? (
            <SupplierPurchasePrintActions
              purchase={purchase}
              supplier={supplier}
              itemNames={itemNames}
            />
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={saveDetails}>Save invoice details</Button>
          </div>
        </div>
      }
    >
      {!purchase ? (
        <p className="text-sm text-slate-600">Invoice not found.</p>
      ) : (
        <div className="space-y-6">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Supplier</dt>
              <dd className="font-medium">{supplierName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">PO reference</dt>
              <dd className="font-mono text-xs">{purchase.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ordered</dt>
              <dd>{formatDate(purchase.purchasedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Balance due</dt>
              <dd className="font-bold text-violet-900">{formatMoney(balance)}</dd>
            </div>
          </dl>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Invoice number">
              <input
                className={inputClass}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </FormField>
            <FormField label="Notes">
              <input
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold ${
                view === "supplier"
                  ? "bg-sky-100 text-sky-900"
                  : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setView("supplier")}
            >
              Supplier copy
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-semibold ${
                view === "internal"
                  ? "bg-violet-100 text-violet-900"
                  : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setView("internal")}
            >
              Internal (DST)
            </button>
          </div>

          {view === "supplier" ? (
            <section>
              <p className="text-xs text-slate-500">
                For the supplier — buy quantities and unit prices only (no sell price or profit).
              </p>
              <ul className="mt-2 space-y-2">
                {lines.map((line, idx) => {
                  const name = itemNames[line.itemId] ?? line.itemId;
                  return (
                    <li
                      key={`${line.itemId}-${idx}`}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">{name}</p>
                      <p className="mt-1 text-slate-600">
                        {line.qty} {line.unit} @ {formatMoney(line.unitBuyPrice)} ={" "}
                        {formatMoney(line.qty * line.unitBuyPrice)}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-sm">
                <strong>Total:</strong>{" "}
                {formatMoney(
                  lines.reduce((s, l) => s + l.qty * l.unitBuyPrice, 0),
                )}{" "}
                · <strong>Paid:</strong> {formatMoney(purchase.amountPaid)} ·{" "}
                <strong>Balance:</strong> {formatMoney(balance)}
              </p>
            </section>
          ) : (
            <section>
              <h3 className="text-sm font-bold text-slate-900">Line items (internal)</h3>
              {hasPayments ? (
                <p className="mt-1 text-xs text-slate-500">
                  Lines are locked after payments — totals cannot drop below paid
                  amount.
                </p>
              ) : null}
              <ul className="mt-2 space-y-2">
                {lines.map((line, idx) => {
                  const name = itemNames[line.itemId] ?? line.itemId;
                  return (
                    <li
                      key={`${line.itemId}-${idx}`}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">{name}</p>
                      {hasPayments ? (
                        <p className="mt-1 text-slate-600">
                          {line.qty} {line.unit} buy {formatMoney(line.unitBuyPrice)}
                          {line.sellPrice
                            ? ` · sell ${formatMoney(line.sellPrice)}`
                            : ""}
                        </p>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <label className="text-xs">
                            Qty
                            <input
                              type="number"
                              min={1}
                              className={`${inputClass} mt-0.5`}
                              value={line.qty}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                setLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, qty } : l,
                                  ),
                                );
                              }}
                            />
                          </label>
                          <label className="text-xs">
                            Buy price
                            <input
                              type="number"
                              className={`${inputClass} mt-0.5`}
                              value={line.unitBuyPrice}
                              onChange={(e) => {
                                const unitBuyPrice = Number(e.target.value);
                                setLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, unitBuyPrice } : l,
                                  ),
                                );
                              }}
                            />
                          </label>
                          <label className="text-xs">
                            Sell price (internal)
                            <input
                              type="number"
                              className={`${inputClass} mt-0.5`}
                              value={line.sellPrice ?? 0}
                              onChange={(e) => {
                                const sellPrice = Number(e.target.value);
                                setLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, sellPrice } : l,
                                  ),
                                );
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Pay supplier — balance {formatMoney(balance)}
              </h3>
              {balance > 0 ? (
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    setShowPayForm(true);
                    setView("internal");
                  }}
                >
                  Pay balance
                </Button>
              ) : (
                <span className="text-xs font-medium text-emerald-700">Paid in full</span>
              )}
            </div>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <p className="font-mono text-xs text-slate-500">{p.reference}</p>
                    <p className="font-semibold text-slate-900">
                      {formatMoney(p.amount)} ·{" "}
                      {p.paymentMethod
                        ? paymentMethodLabel(p.paymentMethod)
                        : "—"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatDate(p.occurredAt)} · Released by{" "}
                      <strong>{staffName(p.receivedByStaffId)}</strong>
                      {p.memo ? ` · ${p.memo}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {showPayForm && balance > 0 ? (
              <div className="mt-4 rounded-xl border border-violet-300 bg-white p-4">
                <h4 className="text-sm font-semibold text-violet-900">
                  {payments.length > 0 ? "Additional payment" : "Payment"}
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FormField label="Amount">
                    <input
                      type="number"
                      min={1}
                      max={balance}
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
                  <FormField label="Released / recorded by" className="sm:col-span-2">
                    <select
                      className={inputClass}
                      value={receivedByStaffId}
                      onChange={(e) => setReceivedByStaffId(e.target.value)}
                    >
                      {activeStaff.map((m) => (
                        <option key={m.id} value={m.id}>
                          {staffDisplayName(m)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Memo (optional)" className="sm:col-span-2">
                    <input
                      className={inputClass}
                      value={payMemo}
                      onChange={(e) => setPayMemo(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={recordPayment} disabled={payAmount <= 0}>
                    Record payment
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPayAmount(balance)}
                  >
                    Pay full balance ({formatMoney(balance)})
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          {saveError ? (
            <p className="text-sm text-red-600">{saveError}</p>
          ) : null}
          {saveOk ? <p className="text-sm text-emerald-700">{saveOk}</p> : null}
        </div>
      )}
    </Modal>
  );
}
