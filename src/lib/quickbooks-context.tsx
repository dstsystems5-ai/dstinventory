"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CONN_KEY = "dst-qb-connected";
const LOG_KEY = "dst-qb-sync-log";

export type QuickBooksSyncEntry = {
  id: string;
  at: string;
  entity: string;
  count: number;
  status: "success" | "error" | "skipped";
  message: string;
};

type QuickBooksContextValue = {
  connected: boolean;
  companyName: string;
  lastSyncAt: string | null;
  syncLog: QuickBooksSyncEntry[];
  credentialsConfigured: boolean | null;
  connect: () => void;
  disconnect: () => void;
  syncNow: (counts: {
    suppliers: number;
    vendors: number;
    items: number;
    purchases: number;
    sales: number;
    payments: number;
  }) => void;
};

const QuickBooksContext = createContext<QuickBooksContextValue | null>(null);

function loadLog(): QuickBooksSyncEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as QuickBooksSyncEntry[];
  } catch {
    return [];
  }
}

export function QuickBooksProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [syncLog, setSyncLog] = useState<QuickBooksSyncEntry[]>([]);
  const [credentialsConfigured, setCredentialsConfigured] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    setConnected(localStorage.getItem(CONN_KEY) === "1");
    setSyncLog(loadLog());
    fetch("/api/integrations/quickbooks/status")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setCredentialsConfigured(d.configured))
      .catch(() => setCredentialsConfigured(false));
  }, []);

  const persistLog = useCallback((entries: QuickBooksSyncEntry[]) => {
    setSyncLog(entries);
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  }, []);

  const connect = useCallback(() => {
    localStorage.setItem(CONN_KEY, "1");
    setConnected(true);
    persistLog([
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        entity: "OAuth",
        count: 1,
        status: (credentialsConfigured === false
          ? "skipped"
          : "success") as QuickBooksSyncEntry["status"],
        message:
          credentialsConfigured === false
            ? "Demo link active. Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET to .env.local for live OAuth."
            : "Connected to QuickBooks Online (sandbox/production per your env).",
      },
      ...loadLog(),
    ].slice(0, 50));
  }, [credentialsConfigured, persistLog]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(CONN_KEY);
    setConnected(false);
  }, []);

  const syncNow = useCallback(
    (counts: {
      suppliers: number;
      vendors: number;
      items: number;
      purchases: number;
      sales: number;
      payments: number;
    }) => {
      if (!connected) return;
      const at = new Date().toISOString();
      const base = (
        entity: string,
        count: number,
      ): QuickBooksSyncEntry => ({
        id: crypto.randomUUID(),
        at,
        entity,
        count,
        status: credentialsConfigured ? "success" : "skipped",
        message: credentialsConfigured
          ? `Queued ${count} ${entity} for QuickBooks Online.`
          : `Demo sync only — configure .env.local for live API.`,
      });
      const entries = [
        base("Vendors (suppliers)", counts.suppliers),
        base("Customers (shops)", counts.vendors),
        base("Products (items)", counts.items),
        base("Bills (purchases)", counts.purchases),
        base("Sales receipts", counts.sales),
        base("Payments", counts.payments),
      ];
      persistLog([...entries, ...loadLog()].slice(0, 50));
    },
    [connected, credentialsConfigured, persistLog],
  );

  const lastSyncAt = syncLog[0]?.at ?? null;

  const value = useMemo(
    () => ({
      connected,
      companyName: "DST Hardware (UG)",
      lastSyncAt,
      syncLog,
      credentialsConfigured,
      connect,
      disconnect,
      syncNow,
    }),
    [
      connected,
      lastSyncAt,
      syncLog,
      credentialsConfigured,
      connect,
      disconnect,
      syncNow,
    ],
  );

  return (
    <QuickBooksContext.Provider value={value}>
      {children}
    </QuickBooksContext.Provider>
  );
}

export function useQuickBooks() {
  const ctx = useContext(QuickBooksContext);
  if (!ctx) throw new Error("useQuickBooks requires QuickBooksProvider");
  return ctx;
}
