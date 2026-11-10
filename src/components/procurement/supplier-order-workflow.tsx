"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/ui/panel-card";
import { FormField, inputClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useFinance } from "@/lib/finance-context";
import { formatMoney } from "@/lib/locale";
import {
  enrichPurchaseLine,
  linePurchaseEconomics,
  purchaseBalance,
} from "@/lib/finance-math";
import { nextReference } from "@/lib/reference-numbers";
import {
  PAYMENT_METHODS,
  QUANTITY_UNITS,
  paymentMethodLabel,
  quantityUnitLabel,
} from "@/lib/payment-labels";
import { useSession } from "@/lib/session-context";
import { staffDisplayName } from "@/lib/permissions";
import type { PaymentMethod, StaffMember } from "@/lib/types";
import { SupplierItemsEditor } from "@/components/procurement/supplier-items-editor";
import { SupplierInvoiceDetail } from "@/components/procurement/supplier-invoice-detail";
import type { PurchaseLine, PurchaseRecord, QuantityUnit } from "@/lib/types";

type DraftLine = PurchaseLine & { key: string };

export function SupplierOrderWorkflow({ allowed }: { allowed: boolean }) {
  const { suppliers, itemsForSupplier, syncSupplierItems, staff } =
    useOrganization();
  const { user } = useSession();
  const { items } = useInventory();
  const { purchases, addPurchase } = useFinance();

  const [supplierId, setSupplierId] = useState("");
  const [itemId, setItemId] = useState("");
  const [unit, setUnit] = useState<QuantityUnit>("bag");
  const [qty, setQty] = useState(1);
  const [unitBuyPrice, setUnitBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [linePaid, setLinePaid] = useState(0);
  const [invoiceLines, setInvoiceLines] = useState<DraftLine[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [orderPaidTotal, setOrderPaidTotal] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceDetailId, setInvoiceDetailId] = useState<string | null>(null);
  const [invoiceFallback, setInvoiceFallback] = useState<PurchaseRecord | null>(
    null,
  );
  const [invoiceDetailTab, setInvoiceDetailTab] = useState<"details" | "pay">(
    "details",
  );
  const [saveNote, setSaveNote] = useState("");
  const [orderPayMethod, setOrderPayMethod] =
    useState<PaymentMethod>("mobile_money");
  const [orderReceivedBy, setOrderReceivedBy] = useState("");
  const activeStaff = useMemo(
    () => staff.filter((m) => m.isActive),
    [staff],
  );
  useEffect(() => {
    if (user.id) setOrderReceivedBy(user.id);
  }, [user.id]);
  const catalogIds = itemsForSupplier(supplierId);
  const catalogItems = useMemo(
    () => items.filter((i) => catalogIds.includes(i.id)),
    [items, catalogIds],
  );

  const pickItem = (id: string) => {
    setItemId(id);
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setUnit(
      (it.unit === "ea" ? "ea" : it.unit === "bag" ? "bag" : "pcs") as QuantityUnit,
    );
    setUnitBuyPrice(it.costPrice);
    setSellPrice(it.sellPrice);
  };

  useEffect(() => {
    if (!supplierId) {
      setItemId("");
      return;
    }
    const first = catalogItems[0];
    if (first) pickItem(first.id);
    else setItemId("");
  }, [supplierId, catalogItems[0]?.id, items]);

  const selectedItem = items.find((i) => i.id === itemId) ?? catalogItems[0];

  const preview = useMemo(() => {
    if (!selectedItem) return null;
    const economics = linePurchaseEconomics({
      qty,
      unitBuyPrice: unitBuyPrice || selectedItem.costPrice,
      sellPrice: sellPrice || selectedItem.sellPrice,
      discountPercent,
    });
    const lineTotal = qty * (unitBuyPrice || selectedItem.costPrice);
    return { ...economics, lineTotal };
  }, [selectedItem, qty, unitBuyPrice, sellPrice, discountPercent]);

  const invoiceTotal = invoiceLines.reduce(
    (s, l) => s + l.qty * l.unitBuyPrice,
    0,
  );
  const invoicePaidOnLines = invoiceLines.reduce(
    (s, l) => s + (l.amountPaidOnLine ?? 0),
    0,
  );

  const addLineToInvoice = () => {
    if (!selectedItem || qty <= 0) return;
    const line = enrichPurchaseLine({
      itemId: selectedItem.id,
      qty,
      unit,
      unitBuyPrice: unitBuyPrice || selectedItem.costPrice,
      sellPrice: sellPrice || selectedItem.sellPrice,
      discountPercent,
      amountPaidOnLine: linePaid,
    });
    setInvoiceLines((prev) => [
      ...prev,
      { ...line, key: crypto.randomUUID() },
    ]);
    setQty(1);
    setLinePaid(0);
  };

  const saveInvoice = () => {
    if (!supplierId) {
      setSaveNote("Select a supplier first.");
      return;
    }
    if (invoiceLines.length === 0) {
      setSaveNote("Add at least one item to the invoice, then save.");
      return;
    }
    const reference = nextReference("PO");
    const inv = invoiceNumber.trim() || nextReference("INV");
    const paid = orderPaidTotal + invoicePaidOnLines;
    const created = addPurchase({
      supplierId,
      reference,
      invoiceNumber: inv,
      purchasedAt: new Date().toISOString(),
      lines: invoiceLines.map(({ key: _k, ...l }) => l),
      amountPaid: paid,
      initialPaymentMethod: paid > 0 ? orderPayMethod : undefined,
      initialReceivedByStaffId: paid > 0 ? orderReceivedBy : undefined,
    });
    setInvoiceFallback(created);
    setInvoiceDetailId(created.id);
    setInvoiceOpen(true);
    setInvoiceDetailTab("details");
    setInvoiceLines([]);
    setOrderPaidTotal(0);
    setInvoiceNumber("");
    setSaveNote("Invoice saved. Use Print for supplier in the window that opened.");
  };

  const openInvoice = (purchaseId: string, pay = false) => {
    setInvoiceFallback(null);
    setInvoiceDetailId(purchaseId);
    setInvoiceDetailTab(pay ? "pay" : "details");
    setInvoiceOpen(true);
  };

  if (!allowed) {
    return (
      <PanelCard tone="violet" title="Supplier order & invoice">
        <p className="text-sm text-slate-600">Procurement admin only.</p>
      </PanelCard>
    );
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div className="space-y-6">
      <PanelCard
        tone="violet"
        title="Step 1 — Select supplier"
        description="Choose who you are buying from. Item lists below update for that supplier only."
      >
        <FormField label="Supplier">
          <select
            className={inputClass}
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setItemId("");
              setInvoiceLines([]);
            }}
          >
            <option value="">Choose supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      </PanelCard>

      {!supplierId ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Select a supplier above to see their products and build an order.
        </p>
      ) : null}

      {supplierId ? (
        <PanelCard
          tone="sky"
          title="Step 2 — What this supplier supplies"
          description={
            selectedSupplier
              ? `Add or remove catalog products for ${selectedSupplier.name}.`
              : undefined
          }
        >
          <SupplierItemsEditor
            value={catalogIds}
            onChange={(ids) => {
              syncSupplierItems(supplierId, ids);
              if (ids[0]) pickItem(ids[0]);
            }}
          />
        </PanelCard>
      ) : null}

      {supplierId ? (
      <PanelCard
        tone="violet"
        title="Step 3 — Order & invoice"
        description="Pick an item from this supplier, then quantity, pricing, invoice, and payment."
      >
        <FormField label="Item from this supplier">
            <select
              className={inputClass}
              value={itemId || selectedItem?.id || ""}
              onChange={(e) => pickItem(e.target.value)}
              disabled={catalogItems.length === 0}
            >
              {catalogItems.length === 0 ? (
                <option value="">Add products in step 2 first</option>
              ) : (
                catalogItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} · {i.category}
                  </option>
                ))
              )}
            </select>
        </FormField>

        {selectedItem && preview ? (
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-sm font-bold text-violet-900">
              {selectedItem.name} — {selectedItem.category}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Quantity">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </FormField>
              <FormField label="Unit measure">
                <select
                  className={inputClass}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                >
                  {QUANTITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {quantityUnitLabel(u)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amount per item (buy)">
                <input
                  type="number"
                  className={inputClass}
                  value={unitBuyPrice}
                  onChange={(e) => setUnitBuyPrice(Number(e.target.value))}
                />
              </FormField>
              <FormField label="Paid for this line">
                <input
                  type="number"
                  className={inputClass}
                  value={linePaid}
                  onChange={(e) => setLinePaid(Number(e.target.value))}
                />
              </FormField>
            </div>
            <p className="mt-2 text-sm">
              <strong>Buy line total:</strong> {formatMoney(preview.lineTotal)}
            </p>
            <details className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                Internal only — not on supplier invoice (sell price &amp; profit)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField label="Selling price (planned)">
                  <input
                    type="number"
                    className={inputClass}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Discount % (on sale)">
                  <input
                    type="number"
                    className={inputClass}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  />
                </FormField>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Expected income</dt>
                  <dd className="font-bold text-emerald-800">
                    {formatMoney(preview.expectedIncome)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Net profit (est.)</dt>
                  <dd className="font-bold text-amber-800">
                    {formatMoney(preview.netProfit)}
                  </dd>
                </div>
              </dl>
            </details>
            <Button className="mt-4" variant="secondary" onClick={addLineToInvoice}>
              Add to invoice
            </Button>
          </div>
        ) : null}

        <InvoiceSection
          invoiceLines={invoiceLines}
          invoiceNumber={invoiceNumber}
          setInvoiceNumber={setInvoiceNumber}
          orderPaidTotal={orderPaidTotal}
          setOrderPaidTotal={setOrderPaidTotal}
          invoiceTotal={invoiceTotal}
          invoicePaidOnLines={invoicePaidOnLines}
          items={items}
          onRemove={(key: string) =>
            setInvoiceLines((p) => p.filter((l) => l.key !== key))
          }
          onSave={saveInvoice}
          saveNote={saveNote}
          orderPayMethod={orderPayMethod}
          setOrderPayMethod={setOrderPayMethod}
          orderReceivedBy={orderReceivedBy}
          setOrderReceivedBy={setOrderReceivedBy}
          activeStaff={activeStaff}
        />
      </PanelCard>
      ) : null}

      {supplierId ? (
      <PanelCard tone="violet" title="Open supplier invoices">
        <ul className="divide-y divide-slate-100">
          {purchases
            .filter((p) => p.supplierId === supplierId)
            .map((p) => {
              const bal = purchaseBalance(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {p.invoiceNumber ?? p.reference}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.lines.length} lines · Total {formatMoney(p.totalCost)} · Paid{" "}
                      {formatMoney(p.amountPaid)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => openInvoice(p.id)}
                    >
                      Open
                    </Button>
                    {bal > 0 ? (
                      <Button
                        className="text-xs"
                        onClick={() => openInvoice(p.id, true)}
                      >
                        Pay {formatMoney(bal)}
                      </Button>
                    ) : (
                      <span className="self-center text-xs font-medium text-emerald-700">
                        Paid in full
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      </PanelCard>
      ) : null}

      <SupplierInvoiceDetail
        purchaseId={invoiceDetailId}
        fallbackPurchase={invoiceFallback}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setInvoiceFallback(null);
        }}
        initialTab={invoiceDetailTab}
      />
    </div>
  );
}

function InvoiceSection({
  invoiceLines,
  invoiceNumber,
  setInvoiceNumber,
  orderPaidTotal,
  setOrderPaidTotal,
  invoiceTotal,
  invoicePaidOnLines,
  items,
  onRemove,
  onSave,
  saveNote,
  orderPayMethod,
  setOrderPayMethod,
  orderReceivedBy,
  setOrderReceivedBy,
  activeStaff,
}: {
  invoiceLines: DraftLine[];
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  orderPaidTotal: number;
  setOrderPaidTotal: (v: number) => void;
  invoiceTotal: number;
  invoicePaidOnLines: number;
  items: { id: string; name: string }[];
  onRemove: (key: string) => void;
  onSave: () => void;
  saveNote?: string;
  orderPayMethod: PaymentMethod;
  setOrderPayMethod: (m: PaymentMethod) => void;
  orderReceivedBy: string;
  setOrderReceivedBy: (id: string) => void;
  activeStaff: StaffMember[];
}) {
  if (invoiceLines.length === 0 && !invoiceNumber) {
    return (
      <p className="mt-4 text-xs text-slate-500">
        Add lines above to build an invoice, then save and pay.
      </p>
    );
  }

  const totalPaid = orderPaidTotal + invoicePaidOnLines;

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h4 className="text-sm font-bold text-slate-900">Invoice items</h4>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <FormField label="Supplier invoice #">
          <input
            className={inputClass}
            placeholder="Auto if empty"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </FormField>
        <FormField label="Payment on this invoice (total)">
          <input
            type="number"
            className={inputClass}
            value={orderPaidTotal}
            onChange={(e) => setOrderPaidTotal(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Payment method">
          <select
            className={inputClass}
            value={orderPayMethod}
            onChange={(e) =>
              setOrderPayMethod(e.target.value as PaymentMethod)
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
            value={orderReceivedBy}
            onChange={(e) => setOrderReceivedBy(e.target.value)}
          >
            {activeStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {staffDisplayName(m)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <ul className="mt-3 space-y-2">
        {invoiceLines.map((l) => {
          const name = items.find((i) => i.id === l.itemId)?.name ?? l.itemId;
          return (
            <li
              key={l.key}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                {name} · {l.qty} {l.unit} @ {formatMoney(l.unitBuyPrice)}
                {l.amountPaidOnLine ? ` · paid ${formatMoney(l.amountPaidOnLine)}` : ""}
              </span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => onRemove(l.key)}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <strong>Order total:</strong> {formatMoney(invoiceTotal)} ·{" "}
          <strong>Total paid:</strong> {formatMoney(totalPaid)} ·{" "}
          <strong>Balance:</strong> {formatMoney(Math.max(0, invoiceTotal - totalPaid))}
        </p>
        <Button onClick={onSave} disabled={invoiceLines.length === 0}>
          Save invoice
        </Button>
      </div>
      {saveNote ? (
        <p className="mt-2 text-sm text-sky-800">{saveNote}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">
        Supplier copy shows buy prices only — no sell price or profit.
      </p>
    </div>
  );
}
