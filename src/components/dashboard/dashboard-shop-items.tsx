"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { PanelCard } from "@/components/ui/panel-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabBar } from "@/components/ui/tabs";
import { useInventory, type ItemInput } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";
import { useShop } from "@/lib/shop-context";
import { formatMoney } from "@/lib/locale";
import { nextReference } from "@/lib/reference-numbers";
import { shopUnitPrice } from "@/lib/shop-context";
import { canManageOtherAdmins } from "@/lib/permissions";
import type { Item } from "@/lib/types";

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

type Filter = "all" | "shop" | "low" | "hidden";

export function DashboardShopItems() {
  const { items, updateItem, addItem } = useInventory();
  const { settings } = useShop();
  const { user, can } = useSession();
  const canManage = can("catalog") || canManageOtherAdmins(user);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ItemInput>(emptyForm);

  const inShopCount = items.filter((i) => i.showInShop !== false).length;
  const lowCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;
  const stockValue = items.reduce(
    (s, i) => s + i.qtyOnHand * i.costPrice,
    0,
  );

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All categories", ...[...set].sort()];
  }, [items]);
  const [category, setCategory] = useState("All categories");

  const filtered = useMemo(() => {
    let list = [...items];
    if (filter === "shop") {
      list = list.filter((i) => i.showInShop !== false);
    } else if (filter === "low") {
      list = list.filter((i) => i.qtyOnHand <= i.reorderLevel);
    } else if (filter === "hidden") {
      list = list.filter((i) => i.showInShop === false);
    }
    if (category !== "All categories") {
      list = list.filter((i) => i.category === category);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      const aLow = a.qtyOnHand <= a.reorderLevel ? 0 : 1;
      const bLow = b.qtyOnHand <= b.reorderLevel ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.name.localeCompare(b.name);
    });
  }, [items, filter, query, category]);

  const patchItem = (item: Item, patch: Partial<ItemInput>) => {
    updateItem(item.id, {
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
      ...patch,
    });
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      sku: nextReference("SKU"),
      barcode: `890${Date.now().toString().slice(-10)}`,
    });
    setModalOpen(true);
  };

  const saveNew = () => {
    if (!form.name.trim() || !form.sku.trim()) return;
    addItem({
      ...form,
      shopPrice: form.shopPrice || form.sellPrice,
    });
    setModalOpen(false);
  };

  return (
    <Box className="space-y-4">
      <PanelCard
        tone="amber"
        title="All shop items"
        description={
          canManage
            ? "Super admin / warehouse — edit stock, prices, and shop visibility here."
            : "Read-only list. Super admin manages items on this screen."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button className="text-xs" onClick={openCreate}>
                Add item
              </Button>
            ) : null}
            <Link
              href="/shop"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
            >
              Counter sales
            </Link>
          </div>
        }
        noPadding
      >
        <Box className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              className={`${inputClass} lg:max-w-xs`}
              placeholder="Search name, SKU, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={`${inputClass} lg:max-w-[180px]`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 lg:ml-auto">
              Stock value {formatMoney(stockValue)}
            </p>
          </div>
        </Box>

        <div className="border-b border-slate-100 px-2 py-2">
        <TabBar
          tone="amber"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          tabs={[
            { id: "all", label: "All", count: items.length },
            { id: "shop", label: "In shop", count: inShopCount },
            { id: "low", label: "Low stock", count: lowCount },
            {
              id: "hidden",
              label: "Not in shop",
              count: items.filter((i) => i.showInShop === false).length,
            },
          ]}
        />
        </div>

        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={[
            "Product",
            "Category",
            "Stock",
            "In shop",
            "Shop price",
            "Buy / sell",
            "Status",
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                No items match. {canManage ? "Add one above." : ""}
              </td>
            </tr>
          ) : (
            filtered.map((item) => {
              const low = item.qtyOnHand <= item.reorderLevel;
              const out = item.qtyOnHand <= 0;
              const status = out ? "out_of_stock" : low ? "low_stock" : "in_stock";
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {item.sku}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {canManage ? (
                      <input
                        className={inputClass}
                        value={item.category}
                        onChange={(e) =>
                          patchItem(item, { category: e.target.value })
                        }
                      />
                    ) : (
                      item.category
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} w-24`}
                        value={item.qtyOnHand}
                        onChange={(e) =>
                          patchItem(item, {
                            qtyOnHand: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    ) : (
                      item.qtyOnHand
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.showInShop !== false}
                          onChange={(e) =>
                            patchItem(item, { showInShop: e.target.checked })
                          }
                        />
                        Sell
                      </label>
                    ) : (
                      <span>{item.showInShop !== false ? "Yes" : "No"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} w-28`}
                        value={shopUnitPrice(item)}
                        onChange={(e) =>
                          patchItem(item, {
                            shopPrice:
                              Number(e.target.value) || item.sellPrice,
                          })
                        }
                      />
                    ) : (
                      formatMoney(shopUnitPrice(item))
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {canManage ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          className={`${inputClass} w-28`}
                          value={item.costPrice}
                          onChange={(e) =>
                            patchItem(item, {
                              costPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                        <input
                          type="number"
                          className={`${inputClass} w-28`}
                          value={item.sellPrice}
                          onChange={(e) =>
                            patchItem(item, {
                              sellPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <>
                        <div>{formatMoney(item.costPrice)} buy</div>
                        <div>{formatMoney(item.sellPrice)} sell</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </PanelCard>

      {canManage ? (
        <p className="text-center text-xs text-slate-500">
          Advanced catalog (barcodes, delete) in{" "}
          <Link href="/inventory" className="font-semibold text-sky-700 underline">
            full inventory
          </Link>
        </p>
      ) : null}

      <Modal
        open={modalOpen}
        title="Add shop item"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNew}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" className="sm:col-span-2">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category">
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </FormField>
          <FormField label="SKU">
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </FormField>
          <FormField label="Stock qty">
            <input
              type="number"
              className={inputClass}
              value={form.qtyOnHand}
              onChange={(e) =>
                setForm({ ...form, qtyOnHand: Number(e.target.value) || 0 })
              }
            />
          </FormField>
          <FormField label="Buy price">
            <input
              type="number"
              className={inputClass}
              value={form.costPrice}
              onChange={(e) =>
                setForm({ ...form, costPrice: Number(e.target.value) || 0 })
              }
            />
          </FormField>
          <FormField label="Sell price">
            <input
              type="number"
              className={inputClass}
              value={form.sellPrice}
              onChange={(e) =>
                setForm({ ...form, sellPrice: Number(e.target.value) || 0 })
              }
            />
          </FormField>
          <FormField label="Shop counter price">
            <input
              type="number"
              className={inputClass}
              value={form.shopPrice || form.sellPrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  shopPrice: Number(e.target.value) || form.sellPrice,
                })
              }
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.showInShop !== false}
              onChange={(e) =>
                setForm({ ...form, showInShop: e.target.checked })
              }
            />
            Show in DST shop
          </label>
        </div>
      </Modal>
    </Box>
  );
}

function Box({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}
