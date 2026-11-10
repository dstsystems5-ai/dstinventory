"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { inboundLineTotals } from "./finance-math";
import { useLedger } from "./ledger-context";
import { formatMoney } from "./locale";
import { nextReference } from "./reference-numbers";
import type {
  DistributionOrder,
  InboundLine,
  InboundReceipt,
  PaymentMethod,
} from "./types";

const STORAGE_KEY = "dst-operations-v1";

type OperationsState = {
  inbound: InboundReceipt[];
  distributions: DistributionOrder[];
};

type OperationsContextValue = OperationsState & {
  registerInbound: (
    input: Omit<
      InboundReceipt,
      "id" | "receiptNumber" | "lineCount" | "status"
    > & { status?: InboundReceipt["status"] },
  ) => InboundReceipt;
  createDistribution: (
    input: Omit<DistributionOrder, "id" | "batchNumber" | "createdAt" | "status"> & {
      recordedByStaffId?: string;
    },
  ) => DistributionOrder;
  payDistribution: (
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    options?: { memo?: string; staffId?: string; paymentId?: string },
  ) => void;
  distributionBalance: (order: DistributionOrder) => number;
  dueSoon: { supplierPurchases: string[]; vendorOrders: DistributionOrder[] };
};

const OperationsContext = createContext<OperationsContextValue | null>(null);

function seedInbound(): InboundReceipt[] {
  return [];
}

function seedDistributions(): DistributionOrder[] {
  return [];
}

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const { appendLedgerEvent } = useLedger();
  const [state, setState] = useState<OperationsState>({
    inbound: seedInbound(),
    distributions: seedDistributions(),
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as OperationsState);
    } catch {
      /* seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const registerInbound = useCallback(
    (
      input: Omit<
        InboundReceipt,
        "id" | "receiptNumber" | "lineCount" | "status"
      > & { status?: InboundReceipt["status"] },
    ) => {
      const lines = input.lines.map((line) => {
        const t = inboundLineTotals(line);
        return { ...line, ...t } as InboundLine;
      });
      const receipt: InboundReceipt = {
        ...input,
        id: crypto.randomUUID(),
        receiptNumber: nextReference("INB"),
        lineCount: lines.length,
        status: input.status ?? "committed",
        lines,
      };
      setState((s) => ({ ...s, inbound: [receipt, ...s.inbound] }));
      return receipt;
    },
    [],
  );

  const createDistribution = useCallback(
    (
      input: Omit<
        DistributionOrder,
        "id" | "batchNumber" | "createdAt" | "status"
      > & { recordedByStaffId?: string },
    ) => {
      const { recordedByStaffId, ...rest } = input;
      const order: DistributionOrder = {
        ...rest,
        id: crypto.randomUUID(),
        batchNumber: nextReference("BAT"),
        createdAt: new Date().toISOString(),
        status: "committed",
      };
      setState((s) => ({
        ...s,
        distributions: [order, ...s.distributions],
      }));
      appendLedgerEvent({
        docKind: "vendor_distribution",
        docId: order.id,
        reference: order.batchNumber,
        eventType: "created",
        summary: `Distribution commitment · total ${formatMoney(order.totalDue)}`,
        staffId: recordedByStaffId,
        amount: order.totalDue,
      });
      if (rest.amountPaid > 0) {
        appendLedgerEvent({
          docKind: "vendor_distribution",
          docId: order.id,
          reference: order.batchNumber,
          eventType: "payment",
          summary: `Initial collection ${formatMoney(rest.amountPaid)}`,
          staffId: recordedByStaffId,
          amount: rest.amountPaid,
        });
      }
      return order;
    },
    [appendLedgerEvent],
  );

  const distributionBalance = useCallback((order: DistributionOrder) => {
    return Math.max(0, order.totalDue - order.amountPaid);
  }, []);

  const payDistribution = useCallback(
    (
      orderId: string,
      amount: number,
      _paymentMethod: PaymentMethod,
      options?: { memo?: string; staffId?: string; paymentId?: string },
    ) => {
      let capped = 0;
      let batchRef = "";
      setState((s) => ({
        ...s,
        distributions: s.distributions.map((o) => {
          if (o.id !== orderId) return o;
          const balance = Math.max(0, o.totalDue - o.amountPaid);
          capped = Math.min(amount, balance);
          if (capped <= 0) return o;
          batchRef = o.batchNumber;
          const nextPaid = o.amountPaid + capped;
          return {
            ...o,
            amountPaid: nextPaid,
            status: nextPaid >= o.totalDue ? "completed" : o.status,
          };
        }),
      }));
      if (capped > 0) {
        appendLedgerEvent({
          docKind: "vendor_distribution",
          docId: orderId,
          reference: batchRef,
          eventType: "payment",
          summary: `Collection ${formatMoney(capped)} recorded${
            options?.memo ? ` · ${options.memo}` : ""
          }`,
          staffId: options?.staffId,
          amount: capped,
          paymentId: options?.paymentId,
        });
      }
    },
    [appendLedgerEvent],
  );

  const dueSoon = useMemo(() => {
    if (typeof window === "undefined") {
      return { supplierPurchases: [] as string[], vendorOrders: [] as DistributionOrder[] };
    }
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const vendorOrders = state.distributions.filter((o) => {
      const bal = Math.max(0, o.totalDue - o.amountPaid);
      if (bal <= 0) return false;
      const due = new Date(o.dueDate).getTime();
      return due <= now + week;
    });
    return { supplierPurchases: [], vendorOrders };
  }, [state.distributions]);

  const value = useMemo(
    () => ({
      ...state,
      registerInbound,
      createDistribution,
      payDistribution,
      distributionBalance,
      dueSoon,
    }),
    [
      state,
      registerInbound,
      createDistribution,
      payDistribution,
      distributionBalance,
      dueSoon,
    ],
  );

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const ctx = useContext(OperationsContext);
  if (!ctx) {
    throw new Error("useOperations must be used within OperationsProvider");
  }
  return ctx;
}
