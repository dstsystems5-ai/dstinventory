"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { useQuickBooks } from "@/lib/quickbooks-context";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useFinance } from "@/lib/finance-context";
import { useSession } from "@/lib/session-context";
import { formatDate } from "@/lib/locale";

export function QuickBooksPanel() {
  const qb = useQuickBooks();
  const { suppliers, vendors } = useOrganization();
  const { items } = useInventory();
  const { purchases, sales, payments } = useFinance();
  const { user } = useSession();
  const isFinance =
    user.role === "super_admin" ||
    (user.role === "section_admin" && user.section === "finance");

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        tone="emerald"
        title="QuickBooks Online"
        description="Sync suppliers, shops, items, bills, sales, and payments. Live OAuth needs keys in .env.local."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connection
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {qb.connected ? "Connected" : "Not connected"}
          </p>
          {qb.connected ? (
            <p className="mt-1 text-sm text-slate-600">{qb.companyName}</p>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            API keys:{" "}
            {qb.credentialsConfigured === null
              ? "Checking…"
              : qb.credentialsConfigured
                ? "Found in .env.local"
                : "Missing — add QUICKBOOKS_CLIENT_ID & QUICKBOOKS_CLIENT_SECRET"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!qb.connected ? (
              <Button onClick={qb.connect} disabled={!isFinance}>
                Connect QuickBooks
              </Button>
            ) : (
              <>
                <Button
                  onClick={() =>
                    qb.syncNow({
                      suppliers: suppliers.length,
                      vendors: vendors.length,
                      items: items.length,
                      purchases: purchases.length,
                      sales: sales.length,
                      payments: payments.length,
                    })
                  }
                  disabled={!isFinance}
                >
                  Sync now
                </Button>
                <Button variant="secondary" onClick={qb.disconnect}>
                  Disconnect
                </Button>
              </>
            )}
          </div>
          {!isFinance ? (
            <p className="mt-2 text-xs text-amber-800">
              Finance admin or super admin can connect and sync.
            </p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What syncs
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Suppliers → QuickBooks Vendors</li>
            <li>Vendor shops → Customers</li>
            <li>Inventory items → Products &amp; services</li>
            <li>Purchases → Bills (with balance due)</li>
            <li>Sales → Sales receipts</li>
            <li>Payments → Payments / journal entries</li>
          </ul>
          {qb.lastSyncAt ? (
            <p className="mt-4 text-xs text-slate-500">
              Last sync: {formatDate(qb.lastSyncAt)}
            </p>
          ) : null}
        </article>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Sync log</h3>
        <DataTable columns={["Time", "Entity", "Count", "Status", "Message"]}>
          {qb.syncLog.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                No syncs yet. Connect and press Sync now.
              </td>
            </tr>
          ) : (
            qb.syncLog.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-slate-600">{formatDate(e.at)}</td>
                <td className="px-4 py-3">{e.entity}</td>
                <td className="px-4 py-3">{e.count}</td>
                <td className="px-4 py-3 capitalize">
                  <span
                    className={
                      e.status === "success"
                        ? "text-emerald-700"
                        : e.status === "error"
                          ? "text-red-700"
                          : "text-amber-700"
                    }
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.message}</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </div>
  );
}
