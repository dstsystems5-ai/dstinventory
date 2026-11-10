import type { InboundLine, PurchaseLine, PurchaseRecord, SaleLine, SaleRecord } from "./types";

export function linePurchaseEconomics(
  line: Pick<
    PurchaseLine,
    "qty" | "unitBuyPrice" | "sellPrice" | "discountPercent"
  >,
) {
  const sell = line.sellPrice ?? line.unitBuyPrice;
  const discount = line.discountPercent ?? 0;
  const expectedIncome = line.qty * sell * (1 - discount / 100);
  const cost = line.qty * line.unitBuyPrice;
  const netProfit = expectedIncome - cost;
  return { expectedIncome, netProfit, cost };
}

export function enrichPurchaseLine(line: PurchaseLine): PurchaseLine {
  const { expectedIncome, netProfit } = linePurchaseEconomics(line);
  return { ...line, expectedIncome, netProfit };
}

export function inboundLineTotals(line: Omit<InboundLine, "expectedIncome" | "netProfit">) {
  const expectedIncome = line.qty * line.sellPrice * (1 - line.discountPercent / 100);
  const netProfit = expectedIncome - line.qty * line.buyPrice;
  return { expectedIncome, netProfit };
}

export function purchaseBalance(p: PurchaseRecord): number {
  return Math.max(0, p.totalCost - p.amountPaid);
}

export function lineSaleTotals(line: SaleLine) {
  const gross = line.qty * line.unitSellPrice;
  const fromPercent = gross * (line.discountPercent / 100);
  const fromFlat = line.qty * line.discountAmountUgx;
  const discountTotal = fromPercent + fromFlat;
  const net = gross - discountTotal;
  const cogs = line.qty * line.unitBuyPrice;
  const profit = net - cogs;
  return { gross, discountTotal, net, cogs, profit };
}

export function saleTotals(sale: SaleRecord) {
  return sale.lines.reduce(
    (acc, line) => {
      const t = lineSaleTotals(line);
      acc.gross += t.gross;
      acc.discountTotal += t.discountTotal;
      acc.net += t.net;
      acc.cogs += t.cogs;
      acc.profit += t.profit;
      return acc;
    },
    { gross: 0, discountTotal: 0, net: 0, cogs: 0, profit: 0 },
  );
}

export function sumPurchaseLines(
  lines: PurchaseRecord["lines"],
): number {
  return lines.reduce((s, l) => s + l.qty * l.unitBuyPrice, 0);
}
