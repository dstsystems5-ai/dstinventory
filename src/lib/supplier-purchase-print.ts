import { APP_COUNTRY, APP_CURRENCY, formatDate, formatMoney } from "./locale";
import { quantityUnitLabel } from "./payment-labels";
import type { PurchaseRecord, QuantityUnit, Supplier } from "./types";

const BUYER_NAME = "DST Hardware";
const BUYER_LOCATION = "Kampala, Uganda";

type ItemRow = { name: string; qty: number; unit: string; unitPrice: number };

export function buildSupplierPurchaseHtml(
  purchase: PurchaseRecord,
  supplier: Supplier | undefined,
  itemNames: Map<string, string>,
): string {
  const rows: ItemRow[] = purchase.lines.map((l) => ({
    name: itemNames.get(l.itemId) ?? l.itemId,
    qty: l.qty,
    unit: quantityUnitLabel((l.unit ?? "ea") as QuantityUnit),
    unitPrice: l.unitBuyPrice,
  }));
  const invoiceNo =
    purchase.invoiceNumber ?? purchase.reference ?? "Invoice";
  const total = purchase.totalCost;
  const paid = purchase.amountPaid;
  const balance = Math.max(0, total - paid);

  const lineRows = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${r.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.unit)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatMoney(r.unitPrice)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${formatMoney(r.qty * r.unitPrice)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Purchase order ${escapeHtml(invoiceNo)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
    th.num { text-align: right; }
    .totals { margin-top: 16px; max-width: 280px; margin-left: auto; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 16px; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 8px; }
  </style>
</head>
<body>
  <p class="muted">${APP_COUNTRY} · ${APP_CURRENCY}</p>
  <h1>Purchase order / supplier invoice request</h1>
  <p class="muted">Ref: ${escapeHtml(purchase.reference)} · ${escapeHtml(invoiceNo)} · ${formatDate(purchase.purchasedAt)}</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
    <div>
      <p class="muted" style="margin:0 0 4px">To (supplier)</p>
      <p style="margin:0;font-weight:700">${escapeHtml(supplier?.name ?? "—")}</p>
      ${supplier?.contactName ? `<p class="muted" style="margin:4px 0 0">${escapeHtml(supplier.contactName)}</p>` : ""}
      ${supplier?.phone ? `<p class="muted" style="margin:2px 0 0">${escapeHtml(supplier.phone)}</p>` : ""}
      ${supplier?.address ? `<p class="muted" style="margin:2px 0 0">${escapeHtml(supplier.address)}</p>` : ""}
    </div>
    <div>
      <p class="muted" style="margin:0 0 4px">From (buyer)</p>
      <p style="margin:0;font-weight:700">${BUYER_NAME}</p>
      <p class="muted" style="margin:4px 0 0">${BUYER_LOCATION}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th>Unit</th>
        <th class="num">Unit price</th>
        <th class="num">Line total</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${formatMoney(total)}</span></div>
    ${paid > 0 ? `<div><span>Amount paid</span><span>${formatMoney(paid)}</span></div>` : ""}
    ${balance > 0 ? `<div><span>Balance due</span><span>${formatMoney(balance)}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${formatMoney(total)}</span></div>
  </div>

  ${purchase.notes ? `<p style="margin-top:24px;font-size:13px"><strong>Notes:</strong> ${escapeHtml(purchase.notes)}</p>` : ""}

  <p class="muted" style="margin-top:32px">This document is for the supplier only — purchase quantities and agreed buy prices.</p>
</body>
</html>`;
}

function escapeHtml(s: string | undefined | null): string {
  const t = s ?? "";
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens print dialog (choose Save as PDF in the dialog). */
export function printSupplierPurchaseDocument(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Supplier invoice print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1000);
    }
  };
  window.setTimeout(runPrint, 350);
}

export function downloadSupplierPurchaseHtml(
  html: string,
  filename: string,
): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
