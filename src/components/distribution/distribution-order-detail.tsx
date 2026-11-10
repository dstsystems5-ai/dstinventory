"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useOperations } from "@/lib/operations-context";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useFinance } from "@/lib/finance-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { staffDisplayName } from "@/lib/permissions";
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
  quantityUnitLabel,
} from "@/lib/payment-labels";
import { nextReference } from "@/lib/reference-numbers";
import type { DistributionOrder, PaymentMethod } from "@/lib/types";

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  /** Right after create, until operations state re-renders. */
  fallbackOrder?: DistributionOrder | null;
  initialShowPay?: boolean;
};

export function DistributionOrderDetail({
  orderId,
  open,
  onClose,
  fallbackOrder,
  initialShowPay = false,
}: Props) {
  const { distributions, distributionBalance, payDistribution } =
    useOperations();
  const { vendors, staff } = useOrganization();
  const { items } = useInventory();
  const { payments, addPayment } = useFinance();
  const { user, can } = useSession();

  const order =
    distributions.find((o) => o.id === orderId) ??
    (fallbackOrder?.id === orderId ? fallbackOrder : null);

  const vendor = vendors.find((v) => v.id === order?.vendorShopId);
  const agent = staff.find((m) => m.id === order?.agentStaffId);
  const balance = order ? distributionBalance(order) : 0;

  const orderPayments = useMemo(() => {
    if (!orderId) return [];
    return payments
      .filter(
        (p) => p.distributionOrderId === orderId && p.direction === "in",
      )
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );
  }, [payments, orderId]);

  const [showPayForm, setShowPayForm] = useState(initialShowPay);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mobile_money");
  const [payMemo, setPayMemo] = useState("");

  const canPay = can("vendors") || can("catalog");

  useEffect(() => {
    if (!order || !open) return;
    setPayAmount(balance > 0 ? balance : 0);
    setPayMethod(order.preferredPaymentMethod);
    setShowPayForm(initialShowPay && balance > 0);
    setPayMemo("");
  }, [order, open, balance, initialShowPay]);

  const recordPayment = () => {
    if (!order || !vendor || payAmount <= 0 || balance <= 0) return;
    const amount = Math.min(payAmount, balance);
    const paymentId = crypto.randomUUID();
    payDistribution(order.id, amount, payMethod, {
      memo: payMemo.trim() || undefined,
      staffId: user.id,
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
      receivedByStaffId: user.id,
    });
    setPayMemo("");
    setShowPayForm(false);
  };

  return (
    <Modal
      open={open}
      wide
      title={
        order
          ? `Distribution ${order.batchNumber}`
          : "Distribution commitment"
      }
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {!order ? (
        <p className="text-sm text-slate-600">Commitment not found.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-500">
              Created {formatDate(order.createdAt)}
            </span>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Vendor shop</dt>
              <dd className="font-medium">
                {vendor?.name ?? "—"}
                {vendor?.region ? (
                  <span className="font-normal text-slate-600">
                    {" "}
                    · {vendor.region}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Field agent</dt>
              <dd className="font-medium">
                {agent ? staffDisplayName(agent) : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Delivery location</dt>
              <dd>{order.deliveryLocation || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Contact</dt>
              <dd>
                {order.contactName || "—"}
                {order.contactPhone ? (
                  <span className="text-slate-600"> · {order.contactPhone}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Payment terms</dt>
              <dd>{order.paymentTerms || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Due date</dt>
              <dd>
                {formatDate(order.dueDate)}
                {order.sendReminders ? (
                  <span className="text-xs text-sky-700"> · reminders on</span>
                ) : (
                  <span className="text-xs text-slate-500"> · no reminders</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Preferred payment</dt>
              <dd>{paymentMethodLabel(order.preferredPaymentMethod)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Balance due</dt>
              <dd className="text-lg font-bold text-violet-900">
                {formatMoney(balance)}
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="text-sm font-bold text-slate-900">Items requested</h3>
            {order.lines.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No line items.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {order.lines.map((line, idx) => {
                  const item = items.find((i) => i.id === line.itemId);
                  const name = item?.name ?? line.itemId;
                  const unitPrice = item?.sellPrice ?? 0;
                  const lineTotal = line.qtyRequested * unitPrice;
                  return (
                    <li
                      key={`${line.itemId}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-600">
                        {line.qtyRequested}{" "}
                        {quantityUnitLabel(line.unit ?? "ea")} @{" "}
                        {formatMoney(unitPrice)} ={" "}
                        <strong>{formatMoney(lineTotal)}</strong>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-sm">
              <strong>Order total:</strong> {formatMoney(order.totalDue)} ·{" "}
              <strong>Paid:</strong> {formatMoney(order.amountPaid)}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-sm font-bold text-slate-900">Collections</h3>
            {orderPayments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No payment records in finance yet
                {order.amountPaid > 0
                  ? ` (commitment shows ${formatMoney(order.amountPaid)} paid at creation).`
                  : "."}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {orderPayments.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
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
                      {formatDate(p.occurredAt)}
                      {p.memo ? ` · ${p.memo}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {canPay && balance > 0 ? (
              <div className="mt-4">
                {!showPayForm ? (
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => setShowPayForm(true)}
                  >
                    Record collection
                  </Button>
                ) : (
                  <div className="mt-2 space-y-3 rounded-xl border border-violet-200 bg-white p-4">
                    <p className="text-sm font-semibold text-violet-900">
                      Collect balance — {formatMoney(balance)}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Amount">
                        <input
                          type="number"
                          min={0}
                          max={balance}
                          className={inputClass}
                          value={payAmount}
                          onChange={(e) =>
                            setPayAmount(Number(e.target.value))
                          }
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
                      <FormField label="Memo" className="sm:col-span-2">
                        <input
                          className={inputClass}
                          value={payMemo}
                          onChange={(e) => setPayMemo(e.target.value)}
                          placeholder="Optional note"
                        />
                      </FormField>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => setShowPayForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={() => setPayAmount(balance)}
                      >
                        Full balance
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={recordPayment}
                        disabled={payAmount <= 0}
                      >
                        Save payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </Modal>
  );
}
