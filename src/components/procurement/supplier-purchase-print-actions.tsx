"use client";

import { Button } from "@/components/ui/button";
import {
  buildSupplierPurchaseHtml,
  downloadSupplierPurchaseHtml,
  printSupplierPurchaseDocument,
} from "@/lib/supplier-purchase-print";
import type { PurchaseRecord, Supplier } from "@/lib/types";

type Props = {
  purchase: PurchaseRecord;
  supplier: Supplier | undefined;
  itemNames: Record<string, string>;
  className?: string;
};

export function SupplierPurchasePrintActions({
  purchase,
  supplier,
  itemNames,
  className,
}: Props) {
  const fileSlug = (purchase.invoiceNumber ?? purchase.reference ?? "invoice")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]+/g, "-");

  const buildHtml = () =>
    buildSupplierPurchaseHtml(
      purchase,
      supplier,
      new Map(Object.entries(itemNames)),
    );

  return (
    <div className={`flex flex-wrap gap-2 print:hidden ${className ?? ""}`}>
      <Button
        type="button"
        variant="secondary"
        className="text-xs"
        onClick={() => printSupplierPurchaseDocument(buildHtml())}
      >
        Print for supplier
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="text-xs"
        onClick={() => printSupplierPurchaseDocument(buildHtml())}
      >
        Save as PDF
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="text-xs"
        onClick={() => downloadSupplierPurchaseHtml(buildHtml(), `${fileSlug}.html`)}
      >
        Download copy (.html)
      </Button>
    </div>
  );
}
