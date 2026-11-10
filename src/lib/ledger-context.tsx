"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { LedgerDocKind, LedgerEvent, PaymentRecord } from "./types";

const STORAGE_KEY = "dst-ledger-v1";

type LedgerContextValue = {
  events: LedgerEvent[];
  appendLedgerEvent: (
    input: Omit<LedgerEvent, "id" | "occurredAt"> & { occurredAt?: string },
  ) => LedgerEvent;
  eventsForDocument: (docKind: LedgerDocKind, docId: string) => LedgerEvent[];
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEvents(JSON.parse(raw) as LedgerEvent[]);
    } catch {
      /* empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, hydrated]);

  const appendLedgerEvent = useCallback(
    (
      input: Omit<LedgerEvent, "id" | "occurredAt"> & { occurredAt?: string },
    ) => {
      const event: LedgerEvent = {
        ...input,
        id: crypto.randomUUID(),
        occurredAt: input.occurredAt ?? new Date().toISOString(),
      };
      setEvents((prev) => [event, ...prev]);
      return event;
    },
    [],
  );

  const eventsForDocument = useCallback(
    (docKind: LedgerDocKind, docId: string) =>
      events
        .filter((e) => e.docKind === docKind && e.docId === docId)
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        ),
    [events],
  );

  const value = useMemo(
    () => ({ events, appendLedgerEvent, eventsForDocument }),
    [events, appendLedgerEvent, eventsForDocument],
  );

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  );
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}

export type TimelineRow = {
  id: string;
  occurredAt: string;
  kind: "ledger" | "payment";
  title: string;
  detail?: string;
  staffId?: string;
  amount?: number;
  paymentDirection?: PaymentRecord["direction"];
};

/** Merge ledger events and finance payments into one chronological story. */
export function buildDocumentTimeline(
  docKind: LedgerDocKind,
  docId: string,
  ledgerEvents: LedgerEvent[],
  payments: PaymentRecord[],
): TimelineRow[] {
  const docLedger = ledgerEvents
    .filter((e) => e.docKind === docKind && e.docId === docId)
    .map((e) => ({
      id: e.id,
      occurredAt: e.occurredAt,
      kind: "ledger" as const,
      title: e.summary,
      detail: e.eventType,
      staffId: e.staffId,
      amount: e.amount,
    }));

  const linked = payments.filter((p) =>
    docKind === "supplier_invoice"
      ? p.purchaseId === docId
      : p.distributionOrderId === docId,
  );

  const paymentRows: TimelineRow[] = linked.map((p) => ({
    id: `pay-${p.id}`,
    occurredAt: p.occurredAt,
    kind: "payment",
    title:
      p.direction === "out"
        ? `Payment to supplier · ${p.reference}`
        : `Collection from vendor · ${p.reference}`,
    detail: p.memo || p.category,
    staffId: p.receivedByStaffId,
    amount: p.amount,
    paymentDirection: p.direction,
  }));

  const seenPaymentIds = new Set(
    ledgerEvents
      .filter((e) => e.paymentId)
      .map((e) => e.paymentId as string),
  );

  const extraPayments = paymentRows.filter(
    (r) => !seenPaymentIds.has(r.id.replace("pay-", "")),
  );

  return [...docLedger, ...extraPayments].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
