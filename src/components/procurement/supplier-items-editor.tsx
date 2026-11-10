"use client";

import { useMemo, useState } from "react";
import { FormField, inputClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/lib/inventory-context";
import { nextReference } from "@/lib/reference-numbers";
import { QUANTITY_UNITS, quantityUnitLabel } from "@/lib/payment-labels";
import type { QuantityUnit } from "@/lib/types";

type Props = {
  value: string[];
  onChange: (itemIds: string[]) => void;
  compact?: boolean;
  /** When false, add-product dropdown is hidden (pick supplier first). */
  enabled?: boolean;
};

/** Pick which catalog products a supplier provides. */
export function SupplierItemsEditor({
  value,
  onChange,
  compact,
  enabled = true,
}: Props) {
  const { items, addItem } = useInventory();
  const [pickId, setPickId] = useState("");
  const [mode, setMode] = useState<"type" | "catalog">("type");
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualUnit, setManualUnit] = useState<QuantityUnit>("ea");

  const selected = useMemo(
    () => items.filter((i) => value.includes(i.id)),
    [items, value],
  );
  const available = useMemo(
    () => items.filter((i) => !value.includes(i.id)),
    [items, value],
  );

  const linkId = (id: string) => {
    if (value.includes(id)) return;
    onChange([...value, id]);
  };

  const addFromCatalog = () => {
    if (!pickId) return;
    linkId(pickId);
    setPickId("");
  };

  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    const created = addItem({
      sku: nextReference("SKU"),
      barcode: `MAN-${Date.now()}`,
      name,
      category: manualCategory.trim() || "General",
      unit: manualUnit,
      costPrice: 0,
      sellPrice: 0,
      qtyOnHand: 0,
      reorderLevel: 10,
      showInShop: false,
    });
    linkId(created.id);
    setManualName("");
    setManualCategory("");
  };

  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  const selectedList = (
    <>
      {selected.length === 0 ? (
        <p className={compact ? "text-xs text-amber-800" : "text-sm text-amber-800"}>
          Type or pick at least one product this supplier provides.
        </p>
      ) : compact ? (
        <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
          {selected.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.name}
                <span className="text-slate-500"> · {i.category}</span>
              </span>
              <button
                type="button"
                className="shrink-0 text-xs text-red-600"
                onClick={() => remove(i.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm"
            >
              <span>
                {i.name}
                <span className="text-slate-500"> · {i.category}</span>
              </span>
              <button
                type="button"
                className="text-xs font-medium text-red-600 hover:underline"
                onClick={() => remove(i.id)}
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const modeToggle = enabled ? (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
      <button
        type="button"
        className={`flex-1 rounded-md px-2 py-1.5 font-medium ${
          mode === "type" ? "bg-white text-sky-900 shadow-sm" : "text-slate-600"
        }`}
        onClick={() => setMode("type")}
      >
        Type new item
      </button>
      <button
        type="button"
        className={`flex-1 rounded-md px-2 py-1.5 font-medium ${
          mode === "catalog" ? "bg-white text-sky-900 shadow-sm" : "text-slate-600"
        }`}
        onClick={() => setMode("catalog")}
      >
        Pick from catalog
      </button>
    </div>
  ) : null;

  const manualFields = enabled && mode === "type" ? (
    <div className={compact ? "mt-2 space-y-2" : "mt-4 space-y-3"}>
      <FormField label="Item name" className={compact ? "" : "sm:col-span-2"}>
        <input
          className={inputClass}
          placeholder="e.g. Cement 42.5 N, Roofing nail 2in…"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManual();
            }
          }}
        />
      </FormField>
      <div className={compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-3"}>
        <FormField label="Category (optional)">
          <input
            className={inputClass}
            placeholder="Building Materials"
            value={manualCategory}
            onChange={(e) => setManualCategory(e.target.value)}
          />
        </FormField>
        <FormField label="Unit">
          <select
            className={inputClass}
            value={manualUnit}
            onChange={(e) => setManualUnit(e.target.value as QuantityUnit)}
          >
            {QUANTITY_UNITS.map((u) => (
              <option key={u} value={u}>
                {quantityUnitLabel(u)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <Button
        type="button"
        variant="secondary"
        className={compact ? "text-xs" : undefined}
        onClick={addManual}
        disabled={!manualName.trim()}
      >
        Add item
      </Button>
    </div>
  ) : null;

  const catalogFields = enabled && mode === "catalog" ? (
    <div
      className={
        compact
          ? "mt-2 flex gap-2"
          : "mt-4 flex flex-wrap items-end gap-2"
      }
    >
      {compact ? (
        <div className="min-w-0 flex-1">
        <select
          className={`${inputClass} text-sm`}
          value={pickId}
          onChange={(e) => setPickId(e.target.value)}
        >
          <option value="">Choose product…</option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} · {i.category} ({i.sku})
            </option>
          ))}
        </select>
        </div>
      ) : (
        <FormField label="Pick existing catalog item" className="min-w-[220px] flex-1">
          <select
            className={inputClass}
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
          >
            <option value="">Choose product…</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {i.category} ({i.sku})
              </option>
            ))}
          </select>
        </FormField>
      )}
      <Button
        type="button"
        variant="secondary"
        className={compact ? "shrink-0 text-xs" : undefined}
        onClick={addFromCatalog}
        disabled={!pickId}
      >
        Add
      </Button>
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">What this supplier supplies</p>
        {selectedList}
        {modeToggle}
        {manualFields}
        {catalogFields}
        {!enabled ? (
          <p className="text-xs text-slate-500">Enter supplier details above, then add products.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {selectedList}
      {modeToggle}
      {manualFields}
      {catalogFields}
    </div>
  );
}
