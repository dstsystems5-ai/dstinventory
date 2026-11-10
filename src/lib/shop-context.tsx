"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ShopSale, ShopSaleLine, ShopSettings } from "./types";
import { useInventory } from "./inventory-context";
import { useFinance } from "./finance-context";
import { nextReference } from "./reference-numbers";

const STORAGE_KEY = "dst-shop-v1";

const defaultSettings: ShopSettings = {
  shopName: "DST Hardware Shop",
  location: "Kampala, Uganda",
  phone: "+256 700 DST",
  tagline: "Tools, electrical & plumbing at fair prices",
  isOpen: true,
};

function seedSales(): ShopSale[] {
  return [];
}

type ShopState = {
  settings: ShopSettings;
  sales: ShopSale[];
};

type ShopContextValue = ShopState & {
  updateSettings: (s: Partial<ShopSettings>) => void;
  completeShopSale: (input: {
    customerName: string;
    paymentMethod: ShopSale["paymentMethod"];
    lines: ShopSaleLine[];
    amountPaid: number;
  }) => { ok: true } | { ok: false; error: string };
  shopStats: {
    salesCount: number;
    revenueToday: number;
    profitToday: number;
  };
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { items, updateItem } = useInventory();
  const { addPayment } = useFinance();
  const [state, setState] = useState<ShopState>({
    settings: defaultSettings,
    sales: seedSales(),
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShopState;
        setState({
          settings: { ...defaultSettings, ...parsed.settings },
          sales: parsed.sales ?? [],
        });
      }
    } catch {
      /* seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const updateSettings = useCallback((patch: Partial<ShopSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const completeShopSale = useCallback(
    (input: {
      customerName: string;
      paymentMethod: ShopSale["paymentMethod"];
      lines: ShopSaleLine[];
      amountPaid: number;
    }): { ok: true } | { ok: false; error: string } => {
      if (input.lines.length === 0) return { ok: false, error: "Add at least one item." };
      for (const line of input.lines) {
        const item = items.find((i) => i.id === line.itemId);
        if (!item) return { ok: false, error: "Item not found." };
        if (line.qty > item.qtyOnHand) {
          return { ok: false, error: `Not enough stock for ${item.name}.` };
        }
      }
      const total = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      const reference = nextReference("SHOP");
      const soldAt = new Date().toISOString();

      for (const line of input.lines) {
        const item = items.find((i) => i.id === line.itemId)!;
        updateItem(item.id, {
          sku: item.sku,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          unit: item.unit,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          shopPrice: item.shopPrice ?? item.sellPrice,
          showInShop: item.showInShop ?? true,
          qtyOnHand: item.qtyOnHand - line.qty,
          reorderLevel: item.reorderLevel,
        });
      }

      addPayment({
        reference: nextReference("PAY"),
        direction: "in",
        amount: input.amountPaid,
        category: "DST shop sale",
        memo: `${reference} · ${input.customerName || "Walk-in"}`,
        occurredAt: soldAt,
      });

      const sale: ShopSale = {
        id: crypto.randomUUID(),
        reference,
        soldAt,
        customerName: input.customerName || "Walk-in customer",
        paymentMethod: input.paymentMethod,
        lines: input.lines,
        total,
        amountPaid: input.amountPaid,
      };

      setState((s) => ({ ...s, sales: [sale, ...s.sales] }));
      return { ok: true };
    },
    [items, updateItem, addPayment],
  );

  const shopStats = useMemo(() => {
    if (typeof window === "undefined") {
      return { salesCount: 0, revenueToday: 0, profitToday: 0 };
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = state.sales.filter((s) => new Date(s.soldAt) >= startOfDay);
    const revenueToday = today.reduce((s, sale) => s + sale.amountPaid, 0);
    const profitToday = today.reduce((s, sale) => {
      const p = sale.lines.reduce(
        (sum, l) => sum + l.qty * (l.unitPrice - l.unitCost),
        0,
      );
      return s + p;
    }, 0);
    return {
      salesCount: today.length,
      revenueToday,
      profitToday,
    };
  }, [state.sales]);

  const value = useMemo(
    () => ({
      ...state,
      updateSettings,
      completeShopSale,
      shopStats,
    }),
    [state, updateSettings, completeShopSale, shopStats],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export function shopUnitPrice(item: {
  shopPrice?: number;
  sellPrice: number;
}): number {
  return item.shopPrice ?? item.sellPrice;
}
