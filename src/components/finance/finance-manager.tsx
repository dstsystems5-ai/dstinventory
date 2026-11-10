"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { useFinance } from "@/lib/finance-context";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { purchaseBalance, saleTotals } from "@/lib/finance-math";
import { nextReference } from "@/lib/reference-numbers";
import { ReferenceField } from "@/components/ui/reference-field";
import { TabBar } from "@/components/ui/tabs";
import { PanelCard } from "@/components/ui/panel-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SupplierInvoiceDetail } from "@/components/procurement/supplier-invoice-detail";
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
} from "@/lib/payment-labels";
import { staffDisplayName } from "@/lib/permissions";
import type { PaymentMethod } from "@/lib/types";

type PayLineDraft = {
  key: string;
  itemId: string;
  description: string;
  amount: number;
  category: string;
};

let payLineCounter = 0;
function newPayLine(): PayLineDraft {
  payLineCounter += 1;
  return {
    key: `pay-line-${payLineCounter}`,
    itemId: "",
    description: "",
    amount: 0,
    category: "",
  };
}

export function FinanceManager() {
  const {
    payments,
    purchases,
    sales,
    profitSummary,
    addPayment,
    addPurchase,
    recordSale,
  } = useFinance();
  const { suppliers, vendors, staff } = useOrganization();
  const { items } = useInventory();
  const { can, user } = useSession();
  const activeStaff = useMemo(
    () => staff.filter((m) => m.isActive),
    [staff],
  );
  const allowed = can("finance");

  const [payOpen, setPayOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [tab, setTab] = useState<"summary" | "purchases" | "sales" | "payments">(
    "summary",
  );

  const [payForm, setPayForm] = useState({
    reference: "",
    direction: "in" as "in" | "out",
    category: "General",
    memo: "",
    paymentMethod: "mobile_money" as PaymentMethod,
    recordedByStaffId: "",
  });
  const [payLines, setPayLines] = useState<PayLineDraft[]>([newPayLine()]);

  const payLineTotal = useMemo(
    () => payLines.reduce((s, l) => s + (l.amount > 0 ? l.amount : 0), 0),
    [payLines],
  );

  const openPayment = () => {
    setPayForm({
      reference: nextReference("PAY"),
      direction: "in",
      category: "General",
      memo: "",
      paymentMethod: "mobile_money",
      recordedByStaffId: user.id,
    });
    setPayLines([newPayLine()]);
    setPayOpen(true);
  };

  const openPurchaseModal = () => {
    setPurchaseForm({
      supplierId: suppliers[0]?.id ?? "",
      reference: nextReference("PO"),
      itemId: items[0]?.id ?? "",
      qty: 1,
      unitBuyPrice: items[0]?.costPrice ?? 0,
      amountPaid: 0,
    });
    setPurchaseOpen(true);
  };

  const openSaleModal = () => {
    setSaleForm({
      vendorShopId: vendors[0]?.id ?? "",
      reference: nextReference("SALE"),
      itemId: items[0]?.id ?? "",
      qty: 1,
      discountPercent: 0,
      discountAmountUgx: 0,
    });
    setSaleOpen(true);
  };

  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: suppliers[0]?.id ?? "",
    reference: "",
    itemId: items[0]?.id ?? "",
    qty: 1,
    unitBuyPrice: items[0]?.costPrice ?? 0,
    amountPaid: 0,
  });

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<"details" | "pay">("details");

  const [saleForm, setSaleForm] = useState({
    vendorShopId: vendors[0]?.id ?? "",
    reference: "",
    itemId: items[0]?.id ?? "",
    qty: 1,
    discountPercent: 0,
    discountAmountUgx: 0,
  });

  const submitPayment = () => {
    const validLines = payLines.filter((l) => l.amount > 0);
    const total = validLines.reduce((s, l) => s + l.amount, 0);
    if (total <= 0) return;

    const lines = validLines.map((l) => {
      const itemName = l.itemId
        ? items.find((i) => i.id === l.itemId)?.name
        : undefined;
      const description =
        l.description.trim() || itemName || "Payment line";
      return {
        itemId: l.itemId || undefined,
        description,
        amount: l.amount,
        category: l.category.trim() || undefined,
      };
    });

    const lineMemo = lines
      .map((l) => `${l.description} ${formatMoney(l.amount)}`)
      .join("; ");
    const memo = payForm.memo.trim() || lineMemo;

    addPayment({
      reference: payForm.reference,
      direction: payForm.direction,
      amount: total,
      category: payForm.category,
      memo,
      occurredAt: new Date().toISOString(),
      paymentMethod: payForm.paymentMethod,
      receivedByStaffId: payForm.recordedByStaffId || user.id,
      lines,
    });
    setPayOpen(false);
  };

  const updatePayLine = (
    key: string,
    patch: Partial<Omit<PayLineDraft, "key">>,
  ) => {
    setPayLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const submitPurchase = () => {
    const reference = purchaseForm.reference.trim() || nextReference("PO");
    addPurchase({
      supplierId: purchaseForm.supplierId,
      reference,
      purchasedAt: new Date().toISOString(),
      lines: [
        {
          itemId: purchaseForm.itemId,
          qty: purchaseForm.qty,
          unit: "ea",
          unitBuyPrice: purchaseForm.unitBuyPrice,
        },
      ],
      amountPaid: purchaseForm.amountPaid,
    });
    setPurchaseOpen(false);
  };

  const submitSale = () => {
    const item = items.find((i) => i.id === saleForm.itemId);
    if (!item) return;
    recordSale({
      reference: saleForm.reference.trim() || nextReference("SALE"),
      vendorShopId: saleForm.vendorShopId,
      soldAt: new Date().toISOString(),
      lines: [
        {
          itemId: item.id,
          qty: saleForm.qty,
          unitSellPrice: item.sellPrice,
          unitBuyPrice: item.costPrice,
          discountPercent: saleForm.discountPercent,
          discountAmountUgx: saleForm.discountAmountUgx,
        },
      ],
    });
    setSaleOpen(false);
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageHeader
        tone="emerald"
        title="Cash flow & profit"
        description="Track money in/out, supplier balances still owed, discounts, and profit per sale (sell − buy − discount)."
        action={
          allowed ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={openPurchaseModal}>
                Record purchase
              </Button>
              <Button variant="secondary" onClick={openSaleModal}>
                Record sale
              </Button>
              <Button onClick={openPayment}>Record payment</Button>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Finance admin only</span>
          )
        }
      />

      <TabBar
        tone="emerald"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "summary", label: "Summary" },
          { id: "purchases", label: "Purchases", count: purchases.length },
          { id: "sales", label: "Sales", count: sales.length },
          { id: "payments", label: "Payments", count: payments.length },
        ]}
      />

      {tab === "summary" ? (
        <>
          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="emerald" label="Gross sales" value={formatMoney(profitSummary.grossSales)} />
            <StatCard tone="rose" label="Discounts given" value={formatMoney(profitSummary.discountsGiven)} hint="Lost revenue" />
            <StatCard tone="amber" label="Gross profit" value={formatMoney(profitSummary.grossProfit)} hint="After COGS" />
            <StatCard tone="violet" label="Owed to suppliers" value={formatMoney(profitSummary.supplierBalanceDue)} hint="Unpaid balance" />
          </section>
          <PanelCard tone="emerald" title="Cash flow bar" className="mt-4">
            <ProgressBar
              tone="emerald"
              label="Inflow vs total movement"
              value={profitSummary.cashIn}
              max={profitSummary.cashIn + profitSummary.cashOut || 1}
            />
          </PanelCard>
        </>
      ) : null}

      {tab === "purchases" ? (
        <PanelCard tone="violet" title="Purchases & payment status" className="mt-4" noPadding>
          <DataTable columns={["Reference", "Supplier", "Total", "Paid", "Balance due", ""]}>
            {purchases.map((p) => {
              const bal = purchaseBalance(p);
              const sup = suppliers.find((s) => s.id === p.supplierId);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.reference}</td>
                  <td className="px-4 py-3">{sup?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatMoney(p.totalCost)}</td>
                  <td className="px-4 py-3 text-emerald-700">{formatMoney(p.amountPaid)}</td>
                  <td className="px-4 py-3 font-medium text-amber-800">{formatMoney(bal)}</td>
                  <td className="px-4 py-3">
                    {allowed ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            setInvoiceId(p.id);
                            setInvoiceTab("details");
                            setInvoiceOpen(true);
                          }}
                        >
                          Open
                        </Button>
                        {bal > 0 ? (
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() => {
                              setInvoiceId(p.id);
                              setInvoiceTab("pay");
                              setInvoiceOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </PanelCard>
      ) : null}

      {tab === "sales" ? (
        <PanelCard tone="sky" title="Sales profit" className="mt-4" noPadding>
          <DataTable columns={["Reference", "Shop", "Net sales", "COGS", "Profit", "Discounts"]}>
            {sales.map((sale) => {
              const t = saleTotals(sale);
              const shop = vendors.find((v) => v.id === sale.vendorShopId);
              return (
                <tr key={sale.id}>
                  <td className="px-4 py-3">{sale.reference}</td>
                  <td className="px-4 py-3">{shop?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatMoney(t.net)}</td>
                  <td className="px-4 py-3">{formatMoney(t.cogs)}</td>
                  <td className={`px-4 py-3 font-medium ${t.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatMoney(t.profit)}
                  </td>
                  <td className="px-4 py-3 text-amber-800">{formatMoney(t.discountTotal)}</td>
                </tr>
              );
            })}
          </DataTable>
        </PanelCard>
      ) : null}

      {tab === "payments" ? (
        <PanelCard tone="amber" title="All payments" className="mt-4" noPadding>
          <DataTable
            columns={[
              "Reference",
              "Date",
              "In/Out",
              "Amount",
              "Lines",
              "Category",
              "Memo",
            ]}
          >
            {payments.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-mono text-xs">{t.reference ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(t.occurredAt)}</td>
                <td className="px-4 py-3 capitalize">
                  <span className={t.direction === "in" ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
                    {t.direction}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatMoney(t.amount)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {t.lines?.length ? (
                    <ul className="space-y-0.5">
                      {t.lines.map((l, i) => (
                        <li key={`${t.id}-line-${i}`}>
                          {l.description} · {formatMoney(l.amount)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3 text-slate-600">{t.memo}</td>
              </tr>
            ))}
          </DataTable>
        </PanelCard>
      ) : null}

      <Modal
        open={payOpen}
        wide
        title="Record payment"
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={payLineTotal <= 0}>
              Save · {formatMoney(payLineTotal)}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ReferenceField
              label="Payment reference"
              kind="PAY"
              value={payForm.reference}
              onChange={(v) => setPayForm({ ...payForm, reference: v })}
              onRegenerate={() =>
                setPayForm({ ...payForm, reference: nextReference("PAY") })
              }
            />
          </div>
          <FormField label="Direction">
            <select
              className={inputClass}
              value={payForm.direction}
              onChange={(e) =>
                setPayForm({
                  ...payForm,
                  direction: e.target.value as "in" | "out",
                })
              }
            >
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
          </FormField>
          <FormField label="Default category">
            <input
              className={inputClass}
              value={payForm.category}
              onChange={(e) =>
                setPayForm({ ...payForm, category: e.target.value })
              }
            />
          </FormField>
          <FormField label="Payment method">
            <select
              className={inputClass}
              value={payForm.paymentMethod}
              onChange={(e) =>
                setPayForm({
                  ...payForm,
                  paymentMethod: e.target.value as PaymentMethod,
                })
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
              value={payForm.recordedByStaffId || user.id}
              onChange={(e) =>
                setPayForm({ ...payForm, recordedByStaffId: e.target.value })
              }
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
              value={payForm.memo}
              onChange={(e) => setPayForm({ ...payForm, memo: e.target.value })}
              placeholder="If empty, built from line items below"
            />
          </FormField>
        </div>

        <PaymentLinesBlock
          payLines={payLines}
          setPayLines={setPayLines}
          items={items}
          updatePayLine={updatePayLine}
          total={payLineTotal}
        />
      </Modal>

      <Modal open={purchaseOpen} title="Record purchase" onClose={() => setPurchaseOpen(false)} footer={<><Button variant="secondary" onClick={() => setPurchaseOpen(false)}>Cancel</Button><Button onClick={submitPurchase}>Save</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Supplier">
            <select className={inputClass} value={purchaseForm.supplierId} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <ReferenceField
              label="PO / purchase reference"
              kind="PO"
              value={purchaseForm.reference}
              onChange={(v) => setPurchaseForm({ ...purchaseForm, reference: v })}
              onRegenerate={() => setPurchaseForm({ ...purchaseForm, reference: nextReference("PO") })}
            />
          </div>
          <FormField label="Item">
            <select className={inputClass} value={purchaseForm.itemId} onChange={(e) => {
              const item = items.find((i) => i.id === e.target.value);
              setPurchaseForm({ ...purchaseForm, itemId: e.target.value, unitBuyPrice: item?.costPrice ?? 0 });
            }}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </FormField>
          <FormField label="Qty">
            <input type="number" className={inputClass} value={purchaseForm.qty} onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) })} />
          </FormField>
          <FormField label="Buy price (UGX)">
            <input type="number" className={inputClass} value={purchaseForm.unitBuyPrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, unitBuyPrice: Number(e.target.value) })} />
          </FormField>
          <FormField label="Already paid (UGX)">
            <input type="number" className={inputClass} value={purchaseForm.amountPaid} onChange={(e) => setPurchaseForm({ ...purchaseForm, amountPaid: Number(e.target.value) })} />
          </FormField>
        </div>
      </Modal>

      <Modal open={saleOpen} title="Record sale" onClose={() => setSaleOpen(false)} footer={<><Button variant="secondary" onClick={() => setSaleOpen(false)}>Cancel</Button><Button onClick={submitSale}>Save</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Vendor shop">
            <select className={inputClass} value={saleForm.vendorShopId} onChange={(e) => setSaleForm({ ...saleForm, vendorShopId: e.target.value })}>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <ReferenceField
              label="Sale reference"
              kind="SALE"
              value={saleForm.reference}
              onChange={(v) => setSaleForm({ ...saleForm, reference: v })}
              onRegenerate={() => setSaleForm({ ...saleForm, reference: nextReference("SALE") })}
            />
          </div>
          <FormField label="Item">
            <select className={inputClass} value={saleForm.itemId} onChange={(e) => setSaleForm({ ...saleForm, itemId: e.target.value })}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </FormField>
          <FormField label="Qty">
            <input type="number" className={inputClass} value={saleForm.qty} onChange={(e) => setSaleForm({ ...saleForm, qty: Number(e.target.value) })} />
          </FormField>
          <FormField label="Discount %">
            <input type="number" className={inputClass} value={saleForm.discountPercent} onChange={(e) => setSaleForm({ ...saleForm, discountPercent: Number(e.target.value) })} />
          </FormField>
          <FormField label="Discount UGX / unit">
            <input type="number" className={inputClass} value={saleForm.discountAmountUgx} onChange={(e) => setSaleForm({ ...saleForm, discountAmountUgx: Number(e.target.value) })} />
          </FormField>
        </div>
      </Modal>

      <SupplierInvoiceDetail
        purchaseId={invoiceId}
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        initialTab={invoiceTab}
      />
    </div>
  );
}

function PaymentLinesBlock({
  payLines,
  setPayLines,
  items,
  updatePayLine,
  total,
}: {
  payLines: PayLineDraft[];
  setPayLines: React.Dispatch<React.SetStateAction<PayLineDraft[]>>;
  items: { id: string; name: string }[];
  updatePayLine: (
    key: string,
    patch: Partial<Omit<PayLineDraft, "key">>,
  ) => void;
  total: number;
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900">Payment lines</h4>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => setPayLines((p) => [...p, newPayLine()])}
        >
          Add line
        </Button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Add one or more items or descriptions. Total is the sum of line amounts.
      </p>
      <ul className="mt-3 space-y-3">
        {payLines.map((line, index) => (
          <li
            key={line.key}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
          >
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Line {index + 1}</span>
              {payLines.length > 1 ? (
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() =>
                    setPayLines((p) => p.filter((l) => l.key !== line.key))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Product (optional)">
                <select
                  className={inputClass}
                  value={line.itemId}
                  onChange={(e) => {
                    const item = items.find((i) => i.id === e.target.value);
                    updatePayLine(line.key, {
                      itemId: e.target.value,
                      description: item?.name ?? line.description,
                    });
                  }}
                >
                  <option value="">— Not linked —</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amount (UGX)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={line.amount || ""}
                  onChange={(e) =>
                    updatePayLine(line.key, {
                      amount: Number(e.target.value),
                    })
                  }
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={line.description}
                  onChange={(e) =>
                    updatePayLine(line.key, { description: e.target.value })
                  }
                  placeholder="What this line is for"
                />
              </FormField>
              <FormField label="Category override (optional)" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={line.category}
                  onChange={(e) =>
                    updatePayLine(line.key, { category: e.target.value })
                  }
                  placeholder="Uses default category if empty"
                />
              </FormField>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        Total: {formatMoney(total)}
      </p>
    </div>
  );
}
