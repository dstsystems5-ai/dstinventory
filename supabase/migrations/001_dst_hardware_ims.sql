-- DST Hardware Inventory Management System — core schema
-- Flow: Main Supplier → DST Hub → Field Personnel → Vendor Shops

create extension if not exists "uuid-ossp";

-- Roles: admin, warehouse_manager, distributor, field_agent, accountant, viewer
create type app_role as enum (
  'admin',
  'warehouse_manager',
  'distributor',
  'field_agent',
  'accountant',
  'viewer'
);

create type stock_movement_type as enum (
  'purchase_in',
  'receive_in',
  'allocate',
  'distribute_out',
  'deliver_to_vendor',
  'adjustment',
  'return_in',
  'return_out'
);

create type document_status as enum (
  'draft',
  'pending',
  'committed',
  'in_transit',
  'partial',
  'completed',
  'cancelled'
);

create type payment_direction as enum ('in', 'out');
create type notification_channel as enum ('in_app', 'email', 'sms', 'push');

-- Personnel (extends auth.users via profile)
create table personnel (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role app_role not null default 'viewer',
  is_active boolean not null default true,
  assigned_region text,
  created_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  payment_terms_days int default 30,
  quickbooks_vendor_id text,
  created_at timestamptz not null default now()
);

create table vendor_shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_name text,
  phone text,
  address text,
  region text,
  assigned_agent_id uuid references personnel (id),
  quickbooks_customer_id text,
  created_at timestamptz not null default now()
);

create table items (
  id uuid primary key default uuid_generate_v4(),
  sku text not null unique,
  barcode text unique,
  name text not null,
  category text,
  unit text not null default 'ea',
  cost_price numeric(14, 2) not null default 0,
  sell_price numeric(14, 2) not null default 0,
  reorder_level int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  po_number text not null unique,
  supplier_id uuid not null references suppliers (id),
  status document_status not null default 'draft',
  ordered_at timestamptz,
  expected_at timestamptz,
  created_by uuid references personnel (id),
  notes text,
  created_at timestamptz not null default now()
);

create table purchase_order_lines (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  item_id uuid not null references items (id),
  qty_ordered int not null check (qty_ordered > 0),
  unit_cost numeric(14, 2) not null,
  qty_received int not null default 0
);

-- Inbound at DST hub (commit from supplier delivery)
create table inbound_receipts (
  id uuid primary key default uuid_generate_v4(),
  receipt_number text not null unique,
  purchase_order_id uuid references purchase_orders (id),
  supplier_id uuid not null references suppliers (id),
  received_by uuid references personnel (id),
  status document_status not null default 'draft',
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table inbound_receipt_lines (
  id uuid primary key default uuid_generate_v4(),
  inbound_receipt_id uuid not null references inbound_receipts (id) on delete cascade,
  item_id uuid not null references items (id),
  qty int not null check (qty > 0),
  scanned_at timestamptz
);

-- Stock on hand at DST hub
create table stock_balances (
  item_id uuid primary key references items (id),
  qty_on_hand int not null default 0 check (qty_on_hand >= 0),
  qty_allocated int not null default 0 check (qty_allocated >= 0),
  updated_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id),
  movement_type stock_movement_type not null,
  qty int not null,
  reference_type text,
  reference_id uuid,
  performed_by uuid references personnel (id),
  notes text,
  created_at timestamptz not null default now()
);

-- Commit stock to field personnel for vendor routes
create table distribution_batches (
  id uuid primary key default uuid_generate_v4(),
  batch_number text not null unique,
  assigned_to uuid not null references personnel (id),
  status document_status not null default 'draft',
  committed_at timestamptz,
  committed_by uuid references personnel (id),
  notes text,
  created_at timestamptz not null default now()
);

create table distribution_lines (
  id uuid primary key default uuid_generate_v4(),
  distribution_batch_id uuid not null references distribution_batches (id) on delete cascade,
  item_id uuid not null references items (id),
  qty_committed int not null check (qty_committed > 0),
  qty_delivered int not null default 0
);

-- Deliveries to vendor shops
create table vendor_deliveries (
  id uuid primary key default uuid_generate_v4(),
  delivery_number text not null unique,
  vendor_shop_id uuid not null references vendor_shops (id),
  distribution_batch_id uuid references distribution_batches (id),
  delivered_by uuid references personnel (id),
  status document_status not null default 'draft',
  delivered_at timestamptz,
  receipt_printed_at timestamptz,
  created_at timestamptz not null default now()
);

create table vendor_delivery_lines (
  id uuid primary key default uuid_generate_v4(),
  vendor_delivery_id uuid not null references vendor_deliveries (id) on delete cascade,
  item_id uuid not null references items (id),
  qty int not null check (qty > 0),
  unit_price numeric(14, 2) not null,
  line_total numeric(14, 2) generated always as (qty * unit_price) stored
);

-- Cashflow
create table cash_accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  account_type text not null default 'bank',
  currency text not null default 'USD',
  balance numeric(14, 2) not null default 0,
  quickbooks_account_id text
);

create table cash_transactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references cash_accounts (id),
  direction payment_direction not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  reference_type text,
  reference_id uuid,
  recorded_by uuid references personnel (id),
  occurred_at timestamptz not null default now(),
  memo text,
  quickbooks_journal_id text,
  created_at timestamptz not null default now()
);

-- Scan audit trail
create table scan_events (
  id uuid primary key default uuid_generate_v4(),
  scanned_code text not null,
  item_id uuid references items (id),
  context text not null,
  reference_id uuid,
  scanned_by uuid references personnel (id),
  device_info text,
  created_at timestamptz not null default now()
);

-- Notifications & messages
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references personnel (id),
  title text not null,
  body text not null,
  channel notification_channel not null default 'in_app',
  is_read boolean not null default false,
  action_url text,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table integration_sync_log (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  entity_type text not null,
  entity_id uuid,
  external_id text,
  status text not null,
  payload jsonb,
  error_message text,
  synced_at timestamptz not null default now()
);

-- Indexes
create index idx_items_barcode on items (barcode);
create index idx_stock_movements_item on stock_movements (item_id, created_at desc);
create index idx_notifications_recipient on notifications (recipient_id, is_read, created_at desc);
create index idx_cash_transactions_occurred on cash_transactions (occurred_at desc);

-- RLS (enable when auth is wired)
alter table personnel enable row level security;
alter table items enable row level security;
