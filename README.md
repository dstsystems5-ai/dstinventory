# DST Hardware — Inventory Management System

Web app (desktop + mobile PWA) for tracking hardware from **suppliers → DST hub → field agents → vendor shops**, with inventory, cash flow, scans, receipts, alerts, and QuickBooks integration path.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — demo data works without a database.

## Docs

- **System design:** [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- **Database:** [supabase/migrations/001_dst_hardware_ims.sql](supabase/migrations/001_dst_hardware_ims.sql)
- **Env template:** `.env.example`

## Modules

| Area | Path |
|------|------|
| Dashboard | `/dashboard` |
| Inventory | `/inventory` |
| Inbound | `/inbound` |
| Distribution | `/distribution` |
| Scan | `/scan` |
| Vendors & personnel | `/vendors`, `/personnel` |
| Cash flow | `/cashflow` |
| Receipts & QuickBooks | `/receipts`, `/integrations` |
| Alerts | `/notifications` |

## Next steps

1. Free disk space, then `npm install` if dependencies are missing.
2. Apply the Supabase migration and set `.env.local`.
3. Wire auth, live API, camera barcode library, QuickBooks OAuth.
