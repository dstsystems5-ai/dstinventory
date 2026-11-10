"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TabBar } from "@/components/ui/tabs";
import { PanelCard } from "@/components/ui/panel-card";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-field";
import { ItemRow } from "@/components/ui/item-row";
import { useShop, shopUnitPrice } from "@/lib/shop-context";
import { useInventory } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import type { ShopPaymentMethod, ShopSaleLine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShopOverview } from "@/components/shop/shop-overview";

type ShopTab = "overview" | "catalog" | "sell" | "sales" | "settings";

type CartLine = ShopSaleLine & { name: string };

export function ShopManager() {
  const { settings, sales, shopStats, updateSettings, completeShopSale } =
    useShop();
  const { items, updateItem } = useInventory();
  const { can } = useSession();
  const canShop = can("shop");

  const [tab, setTab] = useState<ShopTab>("sell");
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState<ShopPaymentMethod>("cash");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickId, setPickId] = useState("");
  const [pickQty, setPickQty] = useState(1);
  const [linePrice, setLinePrice] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const shopItems = useMemo(
    () => items.filter((i) => i.showInShop !== false),
    [items],
  );

  const cartTotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const changeDue = Math.max(0, amountReceived - cartTotal);

  const pickedItem = items.find((i) => i.id === pickId);

  useEffect(() => {
    if (pickId) return;
    const first = shopItems[0];
    if (first) setPickId(first.id);
  }, [shopItems, pickId]);

  useEffect(() => {
    if (!pickedItem) {
      setLinePrice(0);
      return;
    }
    setLinePrice(shopUnitPrice(pickedItem));
  }, [pickedItem]);

  useEffect(() => {
    if (method === "credit") return;
    setAmountReceived(cartTotal);
  }, [cartTotal, method]);

  const addToCart = () => {
    const item = items.find((i) => i.id === pickId);
    if (!item) return;
    const unitPrice = linePrice > 0 ? linePrice : shopUnitPrice(item);
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id
            ? { ...l, qty: l.qty + pickQty, name: item.name }
            : l,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          qty: pickQty,
          unitPrice,
          unitCost: item.costPrice,
        },
      ];
    });
    setPickQty(1);
  };

  const startSellWithItem = (itemId: string) => {
    setPickId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item) setLinePrice(shopUnitPrice(item));
    setTab("sell");
  };

  const updateCartLine = (
    itemId: string,
    patch: Partial<Pick<CartLine, "qty" | "unitPrice">>,
  ) => {
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const checkout = () => {
  const paid =
      method === "credit"
        ? Math.min(amountReceived, cartTotal)
        : amountReceived > 0
          ? amountReceived
          : cartTotal;
    if (method !== "credit" && paid < cartTotal) {
      setMessage("Amount received is less than the sale total.");
      return;
    }
    const result = completeShopSale({
      customerName: customer,
      paymentMethod: method,
      lines: cart.map(({ itemId, qty, unitPrice, unitCost }) => ({
        itemId,
        qty,
        unitPrice,
        unitCost,
      })),
      amountPaid: method === "credit" ? paid : Math.min(paid, cartTotal),
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Sale recorded. Stock and cash updated.");
    setCart([]);
    setCustomer("");
    setAmountReceived(0);
    setTab("sales");
  };

  const linePreviewTotal = pickQty * (linePrice || 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        tone="amber"
        title="DST shop"
        description="Manage what you sell at your retail shop: catalog, counter sales, history, and settings. Stock and payments sync to inventory and cash flow."
        action={
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold uppercase",
              settings.isOpen
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600",
            )}
          >
            {settings.isOpen ? "Open" : "Closed"}
          </span>
        }
      />

      <TabBar
        tone="amber"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "sell", label: "Sell (counter)" },
          { id: "catalog", label: "Catalog", count: shopItems.length },
          { id: "sales", label: "Sales history", count: sales.length },
          { id: "settings", label: "Settings" },
        ]}
      />

      {tab === "overview" ? <ShopOverview /> : null}

      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
          <button type="button" className="ml-2 text-xs underline" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      {tab === "catalog" ? (
        <PanelCard
          tone="amber"
          title="What we sell in the shop"
          description="Toggle visibility and set shop counter price. Warehouse inventory is shared."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {shopItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
              >
                <ItemRow item={item} compact showPrices />
                {canShop ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 w-full text-xs"
                    onClick={() => startSellWithItem(item.id)}
                  >
                    Sell this item
                  </Button>
                ) : null}
                {canShop ? (
                  <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={item.showInShop !== false}
                        onChange={(e) =>
                          updateItem(item.id, {
                            ...item,
                            showInShop: e.target.checked,
                          })
                        }
                      />
                      Show in shop
                    </label>
                    <FormField label="Shop price (UGX)">
                      <input
                        type="number"
                        className={inputClass}
                        value={shopUnitPrice(item)}
                        onChange={(e) =>
                          updateItem(item.id, {
                            ...item,
                            shopPrice: Number(e.target.value) || item.sellPrice,
                          })
                        }
                      />
                    </FormField>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      {tab === "sell" ? (
        <>
          {shopItems.length === 0 ? (
            <PanelCard tone="amber" title="Nothing to sell">
              <p className="text-sm text-slate-600">
                No products are visible in the shop. Open{" "}
                <button
                  type="button"
                  className="font-semibold text-amber-800 underline"
                  onClick={() => setTab("catalog")}
                >
                  Catalog
                </button>{" "}
                and enable items for the shop.
              </p>
            </PanelCard>
          ) : (
            <div className="grid gap-4 xl:grid-cols-5">
              <div className="space-y-4 xl:col-span-3">
                <PanelCard tone="emerald" title="Tap product to sell">
                  {!canShop ? (
                    <p className="text-sm text-slate-500">
                      You need shop sales permission to complete sales.
                    </p>
                  ) : null}
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {shopItems.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          disabled={!canShop || i.qtyOnHand <= 0}
                          onClick={() => startSellWithItem(i.id)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-3 text-left transition",
                            pickId === i.id
                              ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                              : "border-slate-200 bg-white hover:border-emerald-300",
                            i.qtyOnHand <= 0 && "opacity-50",
                          )}
                        >
                          <p className="font-semibold text-slate-900">{i.name}</p>
                          <p className="mt-1 text-sm text-emerald-800">
                            {formatMoney(shopUnitPrice(i))}
                          </p>
                          <p className="text-xs text-slate-500">
                            {i.qtyOnHand} in stock
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PanelCard>

                <PanelCard tone="sky" title="Line details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Quantity">
                      <input
                        type="number"
                        min={1}
                        className={inputClass}
                        value={pickQty}
                        onChange={(e) =>
                          setPickQty(Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                    </FormField>
                    <FormField label="Unit price (UGX)">
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={linePrice || ""}
                        onChange={(e) =>
                          setLinePrice(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                    </FormField>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Line total:{" "}
                    <strong className="text-slate-900">
                      {formatMoney(linePreviewTotal)}
                    </strong>
                  </p>
                  <Button
                    type="button"
                    className="mt-3 w-full sm:w-auto"
                    disabled={!canShop || !pickId}
                    onClick={addToCart}
                  >
                    Add to sale
                  </Button>
                </PanelCard>
              </div>

              <div className="xl:col-span-2">
                <PanelCard
                  tone="amber"
                  title="Complete sale"
                  className="lg:sticky lg:top-20"
                >
                  <FormField label="Customer">
                    <input
                      className={inputClass}
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      placeholder="Walk-in customer"
                    />
                  </FormField>
                  <FormField label="Payment method">
                    <select
                      className={inputClass}
                      value={method}
                      onChange={(e) =>
                        setMethod(e.target.value as ShopPaymentMethod)
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile money</option>
                      <option value="credit">Credit / part pay</option>
                    </select>
                  </FormField>

                  <h4 className="mt-4 text-xs font-bold uppercase text-slate-500">
                    Items in this sale
                  </h4>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
                    {cart.length === 0 ? (
                      <li className="text-slate-500">
                        Add products from the left, then record amount and
                        complete.
                      </li>
                    ) : (
                      cart.map((l) => (
                        <li
                          key={l.itemId}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-2"
                        >
                          <p className="font-medium">{l.name}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="text-xs">
                              Qty
                              <input
                                type="number"
                                min={1}
                                className={`${inputClass} mt-0.5`}
                                value={l.qty}
                                onChange={(e) =>
                                  updateCartLine(l.itemId, {
                                    qty: Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label className="text-xs">
                              Price
                              <input
                                type="number"
                                min={0}
                                className={`${inputClass} mt-0.5`}
                                value={l.unitPrice}
                                onChange={(e) =>
                                  updateCartLine(l.itemId, {
                                    unitPrice: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {formatMoney(l.qty * l.unitPrice)}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-red-600"
                              onClick={() => removeFromCart(l.itemId)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>

                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between font-bold text-slate-900">
                      <dt>Sale total</dt>
                      <dd>{formatMoney(cartTotal)}</dd>
                    </div>
                    <FormField label="Amount received (UGX)">
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={amountReceived || ""}
                        onChange={(e) =>
                          setAmountReceived(Number(e.target.value) || 0)
                        }
                      />
                    </FormField>
                    {method !== "credit" && amountReceived >= cartTotal ? (
                      <div className="flex justify-between text-emerald-800">
                        <dt>Change</dt>
                        <dd className="font-semibold">
                          {formatMoney(changeDue)}
                        </dd>
                      </div>
                    ) : null}
                    {method === "credit" ? (
                      <p className="text-xs text-amber-800">
                        Credit: record how much was paid now (balance can be
                        collected later).
                      </p>
                    ) : null}
                  </dl>

                  <Button
                    className="mt-4 w-full py-3 text-base font-bold"
                    disabled={!canShop || cart.length === 0}
                    onClick={checkout}
                  >
                    Complete sale · {formatMoney(cartTotal)}
                  </Button>
                </PanelCard>
              </div>
            </div>
          )}

          {cart.length > 0 ? (
            <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-amber-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-lg items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-bold text-slate-900">
                    {formatMoney(cartTotal)}
                  </p>
                </div>
                <Button
                  className="ml-auto flex-1"
                  disabled={!canShop}
                  onClick={checkout}
                >
                  Complete sale
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "sales" ? (
        <PanelCard tone="sky" title="Shop sales" noPadding>
          <DataTable
            columns={["Ref", "Date", "Customer", "Pay", "Total", "Paid"]}
          >
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-mono text-xs">{s.reference}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(s.soldAt)}</td>
                <td className="px-4 py-3">{s.customerName}</td>
                <td className="px-4 py-3 capitalize">{s.paymentMethod.replace("_", " ")}</td>
                <td className="px-4 py-3">{formatMoney(s.total)}</td>
                <td className="px-4 py-3 font-medium text-emerald-700">
                  {formatMoney(s.amountPaid)}
                </td>
              </tr>
            ))}
          </DataTable>
        </PanelCard>
      ) : null}

      {tab === "settings" ? (
        <PanelCard tone="slate" title="Shop profile">
          {canShop ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Shop name">
                <input
                  className={inputClass}
                  value={settings.shopName}
                  onChange={(e) => updateSettings({ shopName: e.target.value })}
                />
              </FormField>
              <FormField label="Location">
                <input
                  className={inputClass}
                  value={settings.location}
                  onChange={(e) => updateSettings({ location: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <input
                  className={inputClass}
                  value={settings.phone}
                  onChange={(e) => updateSettings({ phone: e.target.value })}
                />
              </FormField>
              <FormField label="Open for sales">
                <select
                  className={inputClass}
                  value={settings.isOpen ? "yes" : "no"}
                  onChange={(e) => updateSettings({ isOpen: e.target.value === "yes" })}
                >
                  <option value="yes">Yes — shop open</option>
                  <option value="no">No — closed</option>
                </select>
              </FormField>
              <FormField label="Tagline" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={settings.tagline}
                  onChange={(e) => updateSettings({ tagline: e.target.value })}
                />
              </FormField>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{settings.shopName}</p>
              <p>{settings.location}</p>
              <p>{settings.phone}</p>
              <p className="mt-2 italic text-slate-500">{settings.tagline}</p>
            </div>
          )}
        </PanelCard>
      ) : null}
    </div>
  );
}
