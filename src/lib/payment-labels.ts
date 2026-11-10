import type { PaymentMethod, QuantityUnit } from "./types";

export function paymentMethodLabel(m: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    cash: "Cash",
    mobile_money: "Mobile money",
    bank_transfer: "Bank transfer",
    bank_card: "Bank card",
  };
  return map[m];
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "bank_card",
];

export const QUANTITY_UNITS: QuantityUnit[] = [
  "pcs",
  "kg",
  "units",
  "ea",
  "bag",
];

export function quantityUnitLabel(u: QuantityUnit): string {
  const map: Record<QuantityUnit, string> = {
    pcs: "Pieces (pcs)",
    kg: "Kilograms (kg)",
    units: "Units",
    ea: "Each (ea)",
    bag: "Bags",
  };
  return map[u];
}
