"use client";

import { FinanceProvider } from "@/lib/finance-context";
import { LedgerProvider } from "@/lib/ledger-context";
import { OperationsProvider } from "@/lib/operations-context";
import { InventoryProvider } from "@/lib/inventory-context";
import { OrganizationProvider } from "@/lib/organization-context";
import { QuickBooksProvider } from "@/lib/quickbooks-context";
import { ShopProvider } from "@/lib/shop-context";
import { SessionProvider } from "@/lib/session-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <LedgerProvider>
        <FinanceProvider>
          <InventoryProvider>
            <OperationsProvider>
            <ShopProvider>
              <QuickBooksProvider>
                <SessionProvider>{children}</SessionProvider>
              </QuickBooksProvider>
            </ShopProvider>
            </OperationsProvider>
          </InventoryProvider>
        </FinanceProvider>
      </LedgerProvider>
    </OrganizationProvider>
  );
}
