# DST Hardware — Inventory & Stock Management System

## Purpose

One platform to track hardware from **main suppliers** into the **DST hub**, commit stock to **responsible personnel**, and record deliveries to **vendor shops**, with **cash flow**, **scanning**, **printed receipts**, **QuickBooks**, and **notifications** on **desktop and mobile**.

## Supply chain model

```text
Main Supplier ──PO──▶ Inbound @ DST ──Commit──▶ Distribution Batch ──▶ Field Agent
                                                              │
                                                              ▼
                                                    Vendor Shop Delivery
                                                              │
                                                              ▼
                                                    Receipt + Cash / AR sync
```

| Stage | Who acts | System action |
|-------|----------|----------------|
| Order | Purchasing / admin | Create PO, notify supplier terms |
| Receive | Warehouse manager | Scan items, inbound receipt, update stock |
| Commit | Warehouse manager | Allocate to distributor batch, assign personnel |
| Distribute | Field agent | Mobile scan confirm, route to vendors |
| Deliver | Field agent | Delivery doc, print receipt, optional payment |
| Finance | Accountant | Cash in/out, QuickBooks sync |

## Roles (simple permissions)

- **Admin** — users, integrations, settings
- **Warehouse manager** — inbound, stock, commits
- **Distributor / field agent** — batches, deliveries, scans (mobile-first)
- **Accountant** — cashflow, QuickBooks
- **Viewer** — read-only dashboards

## Core modules (app routes)

| Module | Route | Primary users |
|--------|-------|----------------|
| Dashboard | `/dashboard` | Everyone |
| Inventory | `/inventory` | Warehouse |
| Inbound | `/inbound` | Warehouse |
| Distribution | `/distribution` | Warehouse, agents |
| Vendors | `/vendors` | Agents, admin |
| Personnel | `/personnel` | Admin |
| Cash flow | `/cashflow` | Accountant |
| Scan | `/scan` | Warehouse, agents (phone) |
| Receipts | `/receipts` | Agents |
| Integrations | `/integrations` | Admin, accountant |
| Notifications | `/notifications` | Everyone |

## Scanning

- **Barcode / QR** on inbound, batch pick, and vendor delivery
- Each scan writes `scan_events` and updates the active document line
- USB scanners on desktop act as keyboard wedge; camera scan on mobile via browser APIs (upgrade path: native wrapper)

## Receipt printing

- Delivery receipt: vendor, lines, totals, agent signature line
- Browser **Print** → thermal (80mm) or A4 via CSS `@media print`
- Optional: ESC/POS bridge for dedicated printers later

## QuickBooks

- OAuth2 connection (QuickBooks Online)
- Map: suppliers → Vendors, vendor shops → Customers, items → Products, deliveries → Invoices/Sales Receipts, POs → Bills
- `integration_sync_log` for retries and admin visibility
- Sync on **commit** (inbound) and **delivery complete** (revenue/COGS)

## Cash flow

- Accounts: cash drawer, bank, mobile money (configurable)
- Link transactions to PO payments, customer collections, expenses
- Dashboard: in/out this week, outstanding per agent route

## Notifications

Triggers (in-app + optional email/SMS):

- PO expected today / overdue receive
- Stock below reorder level
- Batch assigned to agent
- Delivery pending signature
- QuickBooks sync failure
- Payment due from vendor shop

## Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| Web & mobile UI | Next.js PWA | One codebase, install on phones |
| API & data | Supabase (Postgres, Auth, Realtime) | Fast setup, row-level security |
| Hosting | Vercel + Supabase Cloud | Simple deploy |
| Print | CSS print + PDF route | No extra hardware required |

## Data integrity rules

1. **No negative stock** at DST hub (`stock_balances.qty_on_hand`)
2. **Commit** reduces hub on-hand and increases agent accountability via batch lines
3. **Delivery** reduces batch remaining qty; completes when all lines delivered or returned
4. **Cash** entries require category and optional link to business document

## Phased rollout

1. **MVP** — inventory, inbound, distribution, vendors, demo data (current repo)
2. **Auth + Supabase** — live data, roles, RLS
3. **Scan camera + print** — production floor and routes
4. **QuickBooks** — OAuth and scheduled sync
5. **SMS / push** — Twilio or FCM for urgent alerts

## Environment variables

See `.env.example` in the project root.
