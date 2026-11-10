"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { ReferenceField } from "@/components/ui/reference-field";
import { StatCard } from "@/components/ui/stat-card";
import { TabBar } from "@/components/ui/tabs";
import { PanelCard } from "@/components/ui/panel-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/locale";
import { nextReference } from "@/lib/reference-numbers";
import type { Item } from "@/lib/types";
import type { ItemInput } from "@/lib/inventory-context";
import { useInventory } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";

const emptyForm: ItemInput = {
  sku: "",
  barcode: "",
  name: "",
  category: "General",
  unit: "ea",
  costPrice: 0,
  sellPrice: 0,
  qtyOnHand: 0,
  reorderLevel: 10,
  showInShop: true,
  shopPrice: 0,
};

function marginPercent(cost: number, sell: number): number | null {
  if (sell <= 0) return null;
  return Math.round(((sell - cost) / sell) * 100);
}

export function InventoryManager() {
  const { items, addItem, updateItem, removeItem } = useInventory();
  const { can } = useSession();
  const canManageItems = can("catalog");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemInput>(emptyForm);
  const [listTab, setListTab] = useState<"all" | "low">("all");

  const filtered = useMemo(() => {
    let base =
      listTab === "low"
        ? items.filter((i) => i.qtyOnHand <= i.reorderLevel)
        : items;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.barcode.includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, query, listTab]);

  const lowCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      sku: nextReference("SKU"),
      barcode: `890${Date.now().toString().slice(-10)}`,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      category: item.category,
      unit: item.unit,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      qtyOnHand: item.qtyOnHand,
      reorderLevel: item.reorderLevel,
      showInShop: item.showInShop ?? true,
      shopPrice: item.shopPrice ?? item.sellPrice,
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.sku.trim()) return;
    const payload = {
      ...form,
      shopPrice: form.shopPrice || form.sellPrice,
    };
    if (editing) updateItem(editing.id, payload);
    else addItem(payload);
    setModalOpen(false);
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        tone="sky"
        title="Inventory"
        description="Catalog with buy price, sell price, and margin. SKU and barcode auto-generate when you add an item."
        action={
          canManageItems ? (
            <Button onClick={openCreate}>Add item</Button>
          ) : (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              View only — warehouse or super admin can edit
            </span>
          )
        }
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard tone="sky" label="Products" value={String(items.length)} />
        <StatCard tone="rose" label="Low stock" value={String(lowCount)} hint="At or below reorder" />
        <StatCard
          tone="amber"
          label="Stock units"
          value={items.reduce((s, i) => s + i.qtyOnHand, 0).toLocaleString("en-UG")}
        />
      </section>

      <TabBar
        tone="sky"
        value={listTab}
        onChange={setListTab}
        tabs={[
          { id: "all", label: "All products", count: items.length },
          { id: "low", label: "Low stock", count: lowCount },
        ]}
      />

      <div className="mb-4 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, SKU, barcode…"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
        <p className="text-xs text-slate-500">{filtered.length} shown</p>
      </div>

      <PanelCard tone="sky" title="Stock health" className="mb-4 hidden sm:block" noPadding>
        <div className="p-5">
          <ProgressBar
            tone="sky"
            label="Healthy stock levels"
            value={items.length - lowCount}
            max={items.length || 1}
          />
        </div>
      </PanelCard>

      <ul className="space-y-3 lg:hidden">
        {filtered.map((item) => {
          const low = item.qtyOnHand <= item.reorderLevel;
          const margin = marginPercent(item.costPrice, item.sellPrice);
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.category} · <span className="font-mono">{item.sku}</span>
                  </p>
                </div>
                {low ? <StatusBadge status="pending" /> : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">On hand</dt>
                  <dd className={`font-medium ${low ? "text-amber-800" : ""}`}>
                    {item.qtyOnHand} {item.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Buy / Sell</dt>
                  <dd className="font-medium">
                    {formatMoney(item.costPrice)} → {formatMoney(item.sellPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Margin</dt>
                  <dd className="font-medium text-emerald-700">
                    {margin !== null ? `${margin}%` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Reorder at</dt>
                  <dd>{item.reorderLevel}</dd>
                </div>
              </dl>
              {canManageItems ? (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-600"
                    onClick={() => {
                      if (window.confirm(`Remove ${item.name}?`)) removeItem(item.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3.5">Product</th>
              <th className="px-4 py-3.5 text-right">Stock</th>
              <th className="px-4 py-3.5 text-right">Buy (UGX)</th>
              <th className="px-4 py-3.5 text-right">Sell (UGX)</th>
              <th className="px-4 py-3.5 text-right">Margin</th>
              <th className="px-4 py-3.5 text-right">Reorder</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const low = item.qtyOnHand <= item.reorderLevel;
              const margin = marginPercent(item.costPrice, item.sellPrice);
              return (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.category} · <span className="font-mono">{item.sku}</span>
                    </p>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${low ? "text-amber-800" : ""}`}>
                    {item.qtyOnHand}
                    <span className="block text-xs font-normal text-slate-400">
                      {item.qtyAllocated} allocated
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatMoney(item.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatMoney(item.sellPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {margin !== null ? `${margin}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{item.reorderLevel}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canManageItems ? (
                        <>
                          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => openEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs text-red-600"
                            onClick={() => {
                              if (window.confirm(`Remove ${item.name}?`)) removeItem(item.id);
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit item" : "Add item"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <FormField label="Product name" className="sm:col-span-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </FormField>
          <div className="sm:col-span-2">
            <ReferenceField
              label="SKU"
              kind="SKU"
              value={form.sku}
              onChange={(v) => setForm({ ...form, sku: v })}
              onRegenerate={() => setForm({ ...form, sku: nextReference("SKU") })}
            />
          </div>
          <FormField label="Barcode">
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Category">
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Unit">
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Cost price (UGX)">
            <input type="number" min={0} value={form.costPrice || ""} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) || 0 })} className={inputClass} />
          </FormField>
          <FormField label="Sell price (UGX)">
            <input type="number" min={0} value={form.sellPrice || ""} onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) || 0 })} className={inputClass} />
          </FormField>
          <FormField label="Qty on hand">
            <input type="number" min={0} value={form.qtyOnHand || ""} onChange={(e) => setForm({ ...form, qtyOnHand: Number(e.target.value) || 0 })} className={inputClass} />
          </FormField>
          <FormField label="Reorder level">
            <input type="number" min={0} value={form.reorderLevel || ""} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) || 0 })} className={inputClass} />
          </FormField>
          <FormField label="Shop price (UGX)">
            <input type="number" min={0} value={form.shopPrice || form.sellPrice || ""} onChange={(e) => setForm({ ...form, shopPrice: Number(e.target.value) || 0 })} className={inputClass} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.showInShop !== false} onChange={(e) => setForm({ ...form, showInShop: e.target.checked })} />
            Show in DST retail shop
          </label>
        </form>
      </Modal>
    </div>
  );
}
