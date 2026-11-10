"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Item } from "./types";

const STORAGE_KEY = "dst-hardware-items-v1";

function seedItems(): Item[] {
  return [
    {
      id: "1",
      sku: "DST-HAM-001",
      barcode: "8901234567890",
      name: "16oz Claw Hammer",
      category: "Hand Tools",
      unit: "ea",
      costPrice: 28_000,
      sellPrice: 45_000,
      qtyOnHand: 240,
      qtyAllocated: 60,
      reorderLevel: 50,
      showInShop: true,
      shopPrice: 45_000,
    },
    {
      id: "2",
      sku: "DST-PLS-010",
      barcode: "8901234567891",
      name: "Adjustable Wrench 10in",
      category: "Hand Tools",
      unit: "ea",
      costPrice: 22_000,
      sellPrice: 38_000,
      qtyOnHand: 38,
      qtyAllocated: 20,
      reorderLevel: 40,
      showInShop: true,
      shopPrice: 38_000,
    },
    {
      id: "3",
      sku: "DST-ELC-220",
      barcode: "8901234567892",
      name: "Circuit Breaker 20A",
      category: "Electrical",
      unit: "ea",
      costPrice: 42_000,
      sellPrice: 68_000,
      qtyOnHand: 156,
      qtyAllocated: 0,
      reorderLevel: 30,
      showInShop: true,
      shopPrice: 68_000,
    },
    {
      id: "4",
      sku: "DST-PLM-050",
      barcode: "8901234567893",
      name: "PVC Pipe 1/2in x 10ft",
      category: "Plumbing",
      unit: "ea",
      costPrice: 18_000,
      sellPrice: 28_000,
      qtyOnHand: 420,
      qtyAllocated: 80,
      reorderLevel: 100,
      showInShop: true,
      shopPrice: 28_000,
    },
    {
      id: "cem-32",
      sku: "DST-CMT-32",
      barcode: "8901234567894",
      name: "Cement 32.5 N",
      category: "Building Materials",
      unit: "bag",
      costPrice: 32_000,
      sellPrice: 42_000,
      qtyOnHand: 80,
      qtyAllocated: 0,
      reorderLevel: 40,
      showInShop: false,
      shopPrice: 42_000,
    },
    {
      id: "cem-42",
      sku: "DST-CMT-425",
      barcode: "8901234567895",
      name: "Cement 42.5 N",
      category: "Building Materials",
      unit: "bag",
      costPrice: 36_000,
      sellPrice: 48_000,
      qtyOnHand: 120,
      qtyAllocated: 0,
      reorderLevel: 50,
      showInShop: false,
      shopPrice: 48_000,
    },
  ];
}

function normalizeItem(item: Item): Item {
  return {
    ...item,
    showInShop: item.showInShop ?? true,
    shopPrice: item.shopPrice ?? item.sellPrice,
  };
}

export type ItemInput = Omit<Item, "id" | "qtyAllocated"> & {
  qtyAllocated?: number;
};

type InventoryContextValue = {
  items: Item[];
  addItem: (input: ItemInput) => Item;
  updateItem: (id: string, input: ItemInput) => void;
  removeItem: (id: string) => void;
  receiveStock: (
    itemId: string,
    qty: number,
    pricing?: { costPrice?: number; sellPrice?: number },
  ) => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>(seedItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems((JSON.parse(raw) as Item[]).map(normalizeItem));
      }
    } catch {
      /* keep seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((input: ItemInput) => {
    const created: Item = {
      ...input,
      id: crypto.randomUUID(),
      qtyAllocated: input.qtyAllocated ?? 0,
    };
    setItems((prev) => [...prev, created]);
    return created;
  }, []);

  const updateItem = useCallback((id: string, input: ItemInput) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...input,
              qtyAllocated: input.qtyAllocated ?? item.qtyAllocated,
            }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const receiveStock = useCallback(
    (
      itemId: string,
      qty: number,
      pricing?: { costPrice?: number; sellPrice?: number },
    ) => {
      if (qty <= 0) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                qtyOnHand: item.qtyOnHand + qty,
                costPrice: pricing?.costPrice ?? item.costPrice,
                sellPrice: pricing?.sellPrice ?? item.sellPrice,
                shopPrice: pricing?.sellPrice ?? item.shopPrice ?? item.sellPrice,
              }
            : item,
        ),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({ items, addItem, updateItem, removeItem, receiveStock }),
    [items, addItem, updateItem, removeItem, receiveStock],
  );

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
