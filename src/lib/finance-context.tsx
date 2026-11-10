"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  enrichPurchaseLine,
  purchaseBalance,
  saleTotals,
  sumPurchaseLines,
} from "./finance-math";
import { useLedger } from "./ledger-context";
import { formatMoney } from "./locale";
import { nextReference } from "./reference-numbers";
import type {
  PaymentMethod,
  PaymentRecord,
  PurchaseRecord,
  SaleLine,
  SaleRecord,
  VendorItemDiscount,
} from "./types";

const STORAGE_KEY = "dst-finance-v1";

function seedPurchases(): PurchaseRecord[] {
  return [
    {
      id: "pur-1",
      reference: "PO-2026-04421",
      supplierId: "s1",
      purchasedAt: "2026-11-06T10:00:00Z",
      lines: [
        enrichPurchaseLine({
          itemId: "1",
          qty: 200,
          unit: "ea",
          unitBuyPrice: 28_000,
          sellPrice: 45_000,
          discountPercent: 0,
        }),
        enrichPurchaseLine({
          itemId: "4",
          qty: 100,
          unit: "ea",
          unitBuyPrice: 18_000,
          sellPrice: 28_000,
          discountPercent: 0,
        }),
      ],
      totalCost: 7_400_000,
      amountPaid: 5_000_000,
      notes: "Partial payment — balance due",
    },
  ];
}

function seedPayments(): PaymentRecord[] {
  return [
    {
      id: "pay-1",
      reference: "PAY-2026-00001",
      direction: "out",
      amount: 5_000_000,
      category: "Supplier payment",
      memo: "PO-2026-04421 partial",
      occurredAt: "2026-11-06T11:00:00Z",
      purchaseId: "pur-1",
      paymentMethod: "bank_transfer",
      receivedByStaffId: "sec-fn",
    },
    {
      id: "pay-2",
      reference: "PAY-2026-00002",
      direction: "in",
      amount: 4_500_000,
      category: "Customer collection",
      memo: "Riverview Hardware",
      occurredAt: "2026-11-08T12:05:00Z",
      vendorShopId: "v1",
    },
  ];
}

function seedSales(): SaleRecord[] {
  return [
    {
      id: "sale-1",
      reference: "DEL-2026-3310",
      vendorShopId: "v1",
      soldAt: "2026-11-08T14:00:00Z",
      lines: [
        {
          itemId: "1",
          qty: 12,
          unitSellPrice: 45_000,
          unitBuyPrice: 28_000,
          discountPercent: 5,
          discountAmountUgx: 0,
        },
        {
          itemId: "4",
          qty: 20,
          unitSellPrice: 28_000,
          unitBuyPrice: 18_000,
          discountPercent: 0,
          discountAmountUgx: 1_000,
        },
      ],
    },
  ];
}

function seedDiscounts(): VendorItemDiscount[] {
  return [
    {
      id: "disc-1",
      vendorShopId: "v1",
      itemId: "1",
      discountPercent: 5,
      discountAmountUgx: 0,
      note: "Loyal customer",
    },
  ];
}

type FinanceState = {
  purchases: PurchaseRecord[];
  payments: PaymentRecord[];
  sales: SaleRecord[];
  vendorDiscounts: VendorItemDiscount[];
};

type FinanceContextValue = FinanceState & {
  addPurchase: (
    input: Omit<PurchaseRecord, "id" | "totalCost" | "amountPaid"> & {
      amountPaid?: number;
      initialPaymentMethod?: PaymentMethod;
      initialReceivedByStaffId?: string;
    },
  ) => PurchaseRecord;
  payPurchase: (
    purchaseId: string,
    amount: number,
    options?: {
      memo?: string;
      paymentMethod?: PaymentMethod;
      receivedByStaffId?: string;
    },
  ) => void;
  updatePurchase: (
    id: string,
    input: {
      invoiceNumber?: string;
      notes?: string;
      lines?: PurchaseRecord["lines"];
    },
    meta?: { staffId?: string },
  ) => boolean;
  paymentsForPurchase: (purchaseId: string) => PaymentRecord[];
  paymentsForDistribution: (distributionOrderId: string) => PaymentRecord[];
  addPayment: (
    input: Omit<PaymentRecord, "id" | "reference"> & {
      reference?: string;
      id?: string;
    },
  ) => void;
  recordSale: (
    input: Omit<SaleRecord, "id"> & { lines: SaleLine[] },
  ) => void;
  upsertVendorDiscount: (
    input: Omit<VendorItemDiscount, "id"> & { id?: string },
  ) => void;
  removeVendorDiscount: (id: string) => void;
  profitSummary: {
    grossSales: number;
    discountsGiven: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    supplierBalanceDue: number;
    cashIn: number;
    cashOut: number;
  };
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { appendLedgerEvent } = useLedger();
  const [state, setState] = useState<FinanceState>({
    purchases: seedPurchases(),
    payments: seedPayments(),
    sales: seedSales(),
    vendorDiscounts: seedDiscounts(),
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as FinanceState);
    } catch {
      /* seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addPurchase = useCallback(
    (
      input: Omit<PurchaseRecord, "id" | "totalCost" | "amountPaid"> & {
        amountPaid?: number;
        initialPaymentMethod?: PaymentMethod;
        initialReceivedByStaffId?: string;
      },
    ) => {
      const lines = input.lines.map((l) =>
        enrichPurchaseLine({
          ...l,
          unit: l.unit ?? "ea",
          discountPercent: l.discountPercent ?? 0,
        }),
      );
      const totalCost = sumPurchaseLines(lines);
      const rawPaid = input.amountPaid ?? 0;
      const amountPaid = Math.min(Math.max(0, rawPaid), totalCost);
      const id = crypto.randomUUID();
      const record: PurchaseRecord = {
        ...input,
        lines,
        id,
        totalCost,
        amountPaid,
      };
      const initialPaymentId =
        amountPaid > 0 ? crypto.randomUUID() : undefined;
      setState((s) => {
        const payments = [...s.payments];
        if (amountPaid > 0 && initialPaymentId) {
          payments.push({
            id: initialPaymentId,
            reference: nextReference("PAY"),
            direction: "out",
            amount: amountPaid,
            category: "Supplier payment",
            memo: `Initial payment — ${record.invoiceNumber ?? record.reference}`,
            occurredAt: new Date().toISOString(),
            purchaseId: id,
            paymentMethod: input.initialPaymentMethod ?? "mobile_money",
            receivedByStaffId: input.initialReceivedByStaffId,
          });
        }
        return {
          ...s,
          purchases: [...s.purchases, record],
          payments,
        };
      });
      if (amountPaid > 0 && initialPaymentId) {
        appendLedgerEvent({
          docKind: "supplier_invoice",
          docId: id,
          reference: record.invoiceNumber ?? record.reference,
          eventType: "payment",
          summary: `Initial payment ${formatMoney(amountPaid)}`,
          staffId: input.initialReceivedByStaffId,
          amount: amountPaid,
          paymentId: initialPaymentId,
        });
      }
      appendLedgerEvent({
        docKind: "supplier_invoice",
        docId: id,
        reference: record.invoiceNumber ?? record.reference,
        eventType: "created",
        summary: `Supplier invoice created · total ${formatMoney(totalCost)}`,
        staffId: input.initialReceivedByStaffId,
        amount: totalCost,
      });
      return record;
    },
    [appendLedgerEvent],
  );

  const payPurchase = useCallback(
    (
      purchaseId: string,
      amount: number,
      options?: {
        memo?: string;
        paymentMethod?: PaymentMethod;
        receivedByStaffId?: string;
      },
    ) => {
      let logged = false;
      let paymentId = "";
      let ledgerRef = "";
      let capped = 0;
      setState((s) => {
        const purchase = s.purchases.find((p) => p.id === purchaseId);
        if (!purchase) return s;
        capped = Math.min(amount, purchaseBalance(purchase));
        if (capped <= 0) return s;
        paymentId = crypto.randomUUID();
        ledgerRef = purchase.invoiceNumber ?? purchase.reference;
        logged = true;
        return {
          ...s,
          purchases: s.purchases.map((p) =>
            p.id === purchaseId
              ? { ...p, amountPaid: p.amountPaid + capped }
              : p,
          ),
          payments: [
            ...s.payments,
            {
              id: paymentId,
              reference: nextReference("PAY"),
              direction: "out" as const,
              amount: capped,
              category: "Supplier payment",
              memo: options?.memo ?? `Payment for ${purchase.reference}`,
              occurredAt: new Date().toISOString(),
              purchaseId,
              paymentMethod: options?.paymentMethod,
              receivedByStaffId: options?.receivedByStaffId,
            },
          ],
        };
      });
      if (logged) {
        appendLedgerEvent({
          docKind: "supplier_invoice",
          docId: purchaseId,
          reference: ledgerRef,
          eventType: "payment",
          summary: `Payment ${formatMoney(capped)} recorded`,
          staffId: options?.receivedByStaffId,
          amount: capped,
          paymentId,
        });
      }
    },
    [appendLedgerEvent],
  );

  const updatePurchase = useCallback(
    (
      id: string,
      input: {
        invoiceNumber?: string;
        notes?: string;
        lines?: PurchaseRecord["lines"];
      },
      meta?: { staffId?: string },
    ) => {
      let ok = false;
      let summary = "Invoice details updated";
      let ledgerRef = id;
      setState((s) => {
        const purchase = s.purchases.find((p) => p.id === id);
        if (!purchase) return s;
        ledgerRef = purchase.invoiceNumber ?? purchase.reference;
        const lines = input.lines
          ? input.lines.map((l) =>
              enrichPurchaseLine({
                ...l,
                unit: l.unit ?? "ea",
                discountPercent: l.discountPercent ?? 0,
              }),
            )
          : purchase.lines;
        const totalCost = sumPurchaseLines(lines);
        if (totalCost < purchase.amountPaid - 0.01) return s;
        ok = true;
        const parts: string[] = [];
        if (
          input.invoiceNumber !== undefined &&
          input.invoiceNumber.trim() !== (purchase.invoiceNumber ?? "")
        ) {
          parts.push("invoice number");
        }
        if (input.notes !== undefined) parts.push("notes");
        if (input.lines) parts.push("line items");
        if (totalCost !== purchase.totalCost) {
          parts.push(`total now ${formatMoney(totalCost)}`);
        }
        summary =
          parts.length > 0
            ? `Updated: ${parts.join(", ")}`
            : "Invoice details saved";
        return {
          ...s,
          purchases: s.purchases.map((p) =>
            p.id === id
              ? {
                  ...p,
                  invoiceNumber:
                    input.invoiceNumber !== undefined
                      ? input.invoiceNumber.trim() || undefined
                      : p.invoiceNumber,
                  notes:
                    input.notes !== undefined
                      ? input.notes.trim() || undefined
                      : p.notes,
                  lines,
                  totalCost,
                }
              : p,
          ),
        };
      });
      if (ok) {
        appendLedgerEvent({
          docKind: "supplier_invoice",
          docId: id,
          reference: ledgerRef,
          eventType: "updated",
          summary,
          staffId: meta?.staffId,
        });
      }
      return ok;
    },
    [appendLedgerEvent],
  );

  const paymentsForPurchase = useCallback(
    (purchaseId: string) =>
      state.payments
        .filter((p) => p.purchaseId === purchaseId && p.direction === "out")
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        ),
    [state.payments],
  );

  const paymentsForDistribution = useCallback(
    (distributionOrderId: string) =>
      state.payments
        .filter(
          (p) =>
            p.distributionOrderId === distributionOrderId &&
            p.direction === "in",
        )
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        ),
    [state.payments],
  );

  const addPayment = useCallback(
    (
      input: Omit<PaymentRecord, "id" | "reference"> & {
        reference?: string;
        id?: string;
      },
    ) => {
      setState((s) => ({
        ...s,
        payments: [
          ...s.payments,
          {
            ...input,
            id: input.id ?? crypto.randomUUID(),
            reference: input.reference?.trim() || nextReference("PAY"),
          },
        ],
      }));
    },
    [],
  );

  const recordSale = useCallback(
    (input: Omit<SaleRecord, "id"> & { lines: SaleLine[] }) => {
      const totals = saleTotals({ ...input, id: "" });
      setState((s) => ({
        ...s,
        sales: [...s.sales, { ...input, id: crypto.randomUUID() }],
        payments: [
          ...s.payments,
          {
            id: crypto.randomUUID(),
            reference: nextReference("PAY"),
            direction: "in" as const,
            amount: totals.net,
            category: "Sale revenue",
            memo: input.reference,
            occurredAt: input.soldAt,
            vendorShopId: input.vendorShopId,
          },
        ],
      }));
    },
    [],
  );

  const upsertVendorDiscount = useCallback(
    (input: Omit<VendorItemDiscount, "id"> & { id?: string }) => {
      setState((s) => {
        const existing = input.id
          ? s.vendorDiscounts.find((d) => d.id === input.id)
          : s.vendorDiscounts.find(
              (d) =>
                d.vendorShopId === input.vendorShopId &&
                d.itemId === input.itemId,
            );
        if (existing) {
          return {
            ...s,
            vendorDiscounts: s.vendorDiscounts.map((d) =>
              d.id === existing.id ? { ...d, ...input, id: d.id } : d,
            ),
          };
        }
        return {
          ...s,
          vendorDiscounts: [
            ...s.vendorDiscounts,
            { ...input, id: crypto.randomUUID() },
          ],
        };
      });
    },
    [],
  );

  const removeVendorDiscount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      vendorDiscounts: s.vendorDiscounts.filter((d) => d.id !== id),
    }));
  }, []);

  const profitSummary = useMemo(() => {
    const saleAgg = state.sales.reduce(
      (acc, sale) => {
        const t = saleTotals(sale);
        acc.grossSales += t.gross;
        acc.discountsGiven += t.discountTotal;
        acc.netSales += t.net;
        acc.cogs += t.cogs;
        acc.grossProfit += t.profit;
        return acc;
      },
      {
        grossSales: 0,
        discountsGiven: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
      },
    );
    const supplierBalanceDue = state.purchases.reduce(
      (s, p) => s + purchaseBalance(p),
      0,
    );
    const cashIn = state.payments
      .filter((p) => p.direction === "in")
      .reduce((s, p) => s + p.amount, 0);
    const cashOut = state.payments
      .filter((p) => p.direction === "out")
      .reduce((s, p) => s + p.amount, 0);
    return { ...saleAgg, supplierBalanceDue, cashIn, cashOut };
  }, [state.purchases, state.payments, state.sales]);

  const value = useMemo(
    () => ({
      ...state,
      addPurchase,
      payPurchase,
      updatePurchase,
      paymentsForPurchase,
      paymentsForDistribution,
      addPayment,
      recordSale,
      upsertVendorDiscount,
      removeVendorDiscount,
      profitSummary,
    }),
    [
      state,
      addPurchase,
      payPurchase,
      updatePurchase,
      paymentsForPurchase,
      paymentsForDistribution,
      addPayment,
      recordSale,
      upsertVendorDiscount,
      removeVendorDiscount,
      profitSummary,
    ],
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
