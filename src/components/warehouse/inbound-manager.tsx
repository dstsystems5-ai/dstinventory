"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PanelCard } from "@/components/ui/panel-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormField, inputClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useFinance } from "@/lib/finance-context";
import { useOperations } from "@/lib/operations-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { inboundLineTotals, purchaseBalance } from "@/lib/finance-math";
import { QUANTITY_UNITS, quantityUnitLabel } from "@/lib/payment-labels";
import { SupplierItemsEditor } from "@/components/procurement/supplier-items-editor";
import type { InboundLine, QuantityUnit } from "@/lib/types";

export function InboundManager() {
  const { suppliers, itemsForSupplier, syncSupplierItems } = useOrganization();
  const { items, receiveStock } = useInventory();
  const { purchases } = useFinance();
  const { inbound, registerInbound } = useOperations();
  const { can } = useSession();
  const allowed = can("catalog");
  const canLinkSupplierItems = can("suppliers");

  const openPurchases = useMemo(
    () => purchases.filter((p) => purchaseBalance(p) >= 0),
    [purchases],
  );

  const [purchaseId, setPurchaseId] = useState(openPurchases[0]?.id ?? "");
  const selectedPurchase = purchases.find((p) => p.id === purchaseId);

  const [supplierId, setSupplierId] = useState("");

  const supplierCatalogIds = itemsForSupplier(supplierId);
  const supplierItems = useMemo(
    () => items.filter((i) => supplierCatalogIds.includes(i.id)),
    [items, supplierCatalogIds],
  );

  const [itemId, setItemId] = useState(supplierItems[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<QuantityUnit>("ea");
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [draftLines, setDraftLines] = useState<InboundLine[]>([]);

  useEffect(() => {
    const first = supplierItems[0];
    if (!first) {
      setItemId("");
      return;
    }
    if (!supplierItems.some((i) => i.id === itemId)) {
      setItemId(first.id);
      setCategory(first.category);
      setBuyPrice(first.costPrice);
      setSellPrice(first.sellPrice);
    }
  }, [supplierId, supplierItems, itemId]);

  const item = supplierItems.find((i) => i.id === itemId) ?? supplierItems[0];

  const purchasesForSupplier = useMemo(
    () => openPurchases.filter((p) => p.supplierId === supplierId),
    [openPurchases, supplierId],
  );

  const loadFromPurchase = () => {
    if (!selectedPurchase) return;
    setSupplierId(selectedPurchase.supplierId);
    const lines: InboundLine[] = selectedPurchase.lines.map((l) => {
      const it = items.find((i) => i.id === l.itemId);
      const base = {
        itemId: l.itemId,
        category: it?.category ?? "General",
        qty: l.qty,
        unit: l.unit ?? "ea",
        buyPrice: l.unitBuyPrice,
        sellPrice: l.sellPrice ?? it?.sellPrice ?? l.unitBuyPrice,
        discountPercent: l.discountPercent ?? 0,
      };
      const t = inboundLineTotals(base);
      return { ...base, ...t };
    });
    setDraftLines(lines);
  };

  const addLine = () => {
    if (!item || qty <= 0) return;
    const base = {
      itemId: item.id,
      category: category || item.category,
      qty,
      unit,
      buyPrice: buyPrice || item.costPrice,
      sellPrice: sellPrice || item.sellPrice,
      discountPercent,
    };
    const t = inboundLineTotals(base);
    setDraftLines((p) => [...p, { ...base, ...t }]);
  };

  const commitToStore = () => {
    if (draftLines.length === 0) return;
    const sup = suppliers.find((s) => s.id === supplierId);
    registerInbound({
      supplierId,
      supplierName: sup?.name ?? "—",
      purchaseId: purchaseId || undefined,
      lines: draftLines,
      receivedAt: new Date().toISOString(),
      status: "committed",
    });
    for (const line of draftLines) {
      receiveStock(line.itemId, line.qty, {
        costPrice: line.buyPrice,
        sellPrice: line.sellPrice,
      });
    }
    setDraftLines([]);
  };

  const preview = item
    ? inboundLineTotals({
        itemId: item.id,
        category: category || item.category,
        qty,
        unit,
        buyPrice: buyPrice || item.costPrice,
        sellPrice: sellPrice || item.sellPrice,
        discountPercent,
      })
    : null;

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageHeader
        tone="amber"
        title="Inbound from suppliers"
        description="Register goods into the store with category, units, buying & selling price, discount, expected income, and net profit."
        action={
          allowed ? (
            <Button onClick={commitToStore} disabled={draftLines.length === 0}>
              Commit to stock
            </Button>
          ) : (
            <span className="text-xs text-slate-500">Warehouse admin only</span>
          )
        }
      />

      {allowed ? (
        <PanelCard tone="amber" title="Register inbound lines">
          <FormField label="Step 1 — Select supplier">
            <select
              className={inputClass}
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setPurchaseId("");
                setDraftLines([]);
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

          {!supplierId ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Select a supplier first — then you can pick items they supply and receive stock.
            </p>
          ) : null}

          {supplierId ? (
            <>
          <div className="mt-4 mb-4 grid gap-3 sm:grid-cols-2">
            <FormField label="Load from supplier invoice (optional)">
              <select
                className={inputClass}
                value={purchaseId}
                onChange={(e) => setPurchaseId(e.target.value)}
              >
                <option value="">Manual entry</option>
                {purchasesForSupplier.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.invoiceNumber ?? p.reference} · {formatMoney(p.totalCost)}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex items-end">
              <Button variant="secondary" onClick={loadFromPurchase} disabled={!selectedPurchase}>
                Load invoice lines
              </Button>
            </div>
          </div>

          {canLinkSupplierItems ? (
            <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
              <p className="mb-2 text-xs font-semibold text-sky-900">
                Products this supplier provides (add before receiving)
              </p>
              <SupplierItemsEditor
                compact
                value={supplierCatalogIds}
                onChange={(ids) => syncSupplierItems(supplierId, ids)}
              />
            </div>
          ) : supplierItems.length === 0 ? (
            <p className="mb-4 text-xs text-amber-800">
              No products linked to this supplier. Ask procurement to add them under
              Suppliers, or switch to a procurement user.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Step 2 — Item from this supplier" className="sm:col-span-2">
              <select
                className={inputClass}
                value={itemId}
                onChange={(e) => {
                  const id = e.target.value;
                  setItemId(id);
                  const it = supplierItems.find((i) => i.id === id);
                  if (it) {
                    setCategory(it.category);
                    setBuyPrice(it.costPrice);
                    setSellPrice(it.sellPrice);
                  }
                }}
                disabled={supplierItems.length === 0}
              >
                {supplierItems.length === 0 ? (
                  <option value="">
                    No products for this supplier — add below or on Suppliers
                  </option>
                ) : (
                  supplierItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · {i.category}
                    </option>
                  ))
                )}
              </select>
            </FormField>
            <FormField label="Category">
              <input
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </FormField>
            <FormField label="Quantity">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Unit (pcs, kg, bags…)">
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
            <FormField label="Buying price">
              <input
                type="number"
                className={inputClass}
                value={buyPrice}
                onChange={(e) => setBuyPrice(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Selling price">
              <input
                type="number"
                className={inputClass}
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Discount %">
              <input
                type="number"
                className={inputClass}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </FormField>
          </div>

          {preview ? (
            <p className="mt-3 text-sm text-slate-600">
              Expected income: <strong>{formatMoney(preview.expectedIncome)}</strong> · Net
              profit: <strong>{formatMoney(preview.netProfit)}</strong>
            </p>
          ) : null}

          <Button
            className="mt-3"
            variant="secondary"
            onClick={addLine}
            disabled={!item || supplierItems.length === 0}
          >
            Add line
          </Button>

          {draftLines.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {draftLines.map((l, idx) => {
                const name = items.find((i) => i.id === l.itemId)?.name ?? l.itemId;
                return (
                  <li
                    key={`${l.itemId}-${idx}`}
                    className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span>
                      {name} · {l.qty} {l.unit} · buy {formatMoney(l.buyPrice)} · sell{" "}
                      {formatMoney(l.sellPrice)}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setDraftLines((p) => p.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
            </>
          ) : null}
        </PanelCard>
      ) : null}

      <DataTable columns={["Receipt", "Supplier", "Lines", "Received", "Status"]}>
        {inbound.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-slate-900">{r.receiptNumber}</td>
            <td className="px-4 py-3">{r.supplierName}</td>
            <td className="px-4 py-3">{r.lineCount}</td>
            <td className="px-4 py-3 text-slate-500">
              {r.receivedAt ? formatDate(r.receivedAt) : "—"}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={r.status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
