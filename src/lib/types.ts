export type AdminSection = "warehouse" | "procurement" | "sales" | "finance";

export type AppRole =
  | "super_admin"
  | "section_admin"
  | "warehouse_manager"
  | "field_agent"
  | "accountant"
  | "viewer";

export type DocumentStatus =
  | "draft"
  | "pending"
  | "committed"
  | "in_transit"
  | "partial"
  | "completed"
  | "cancelled";

export type QuantityUnit = "pcs" | "kg" | "units" | "ea" | "bag";

export type PaymentMethod =
  | "cash"
  | "mobile_money"
  | "bank_transfer"
  | "bank_card";

export interface Item {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  /** Price at DST retail shop counter (defaults to sell price). */
  shopPrice?: number;
  /** Listed on the DST shop floor / counter. */
  showInShop?: boolean;
  qtyOnHand: number;
  qtyAllocated: number;
  reorderLevel: number;
}

export type ShopPaymentMethod = "cash" | "mobile_money" | "credit";

export interface ShopSettings {
  shopName: string;
  location: string;
  phone: string;
  tagline: string;
  isOpen: boolean;
}

export interface ShopSaleLine {
  itemId: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface ShopSale {
  id: string;
  reference: string;
  soldAt: string;
  customerName: string;
  paymentMethod: ShopPaymentMethod;
  lines: ShopSaleLine[];
  total: number;
  amountPaid: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface VendorShop {
  id: string;
  name: string;
  region: string;
  contactName: string;
  phone: string;
  assignedStaffId: string;
  /** Saved for the next delivery to this shop. */
  deliveryLocation?: string;
  paymentTerms?: string;
  balanceDue?: number;
  sendReminders?: boolean;
  preferredPaymentMethod?: PaymentMethod;
  nextDueDate?: string;
}

export interface SupplierItemLink {
  id: string;
  supplierId: string;
  itemId: string;
}

export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: AppRole;
  section?: AdminSection;
  region: string;
  isActive: boolean;
}

export interface VendorItemDiscount {
  id: string;
  vendorShopId: string;
  itemId: string;
  discountPercent: number;
  discountAmountUgx: number;
  note?: string;
}

export interface PurchaseLine {
  itemId: string;
  qty: number;
  unit: QuantityUnit;
  unitBuyPrice: number;
  amountPaidOnLine?: number;
  sellPrice?: number;
  discountPercent?: number;
  expectedIncome?: number;
  netProfit?: number;
}

export interface PurchaseRecord {
  id: string;
  reference: string;
  invoiceNumber?: string;
  supplierId: string;
  purchasedAt: string;
  lines: PurchaseLine[];
  totalCost: number;
  amountPaid: number;
  notes?: string;
}

/** Line on a manual cash-flow payment (cashflow “Record payment”). */
export interface PaymentAllocationLine {
  itemId?: string;
  description: string;
  amount: number;
  category?: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  direction: "in" | "out";
  amount: number;
  category: string;
  memo: string;
  occurredAt: string;
  purchaseId?: string;
  vendorShopId?: string;
  distributionOrderId?: string;
  paymentMethod?: PaymentMethod;
  /** Staff who recorded or released this payment. */
  receivedByStaffId?: string;
  /** Optional split across items / descriptions (one payment, many lines). */
  lines?: PaymentAllocationLine[];
}

export type LedgerDocKind = "supplier_invoice" | "vendor_distribution";

export type LedgerEventType =
  | "created"
  | "updated"
  | "payment"
  | "status";

export interface LedgerEvent {
  id: string;
  occurredAt: string;
  docKind: LedgerDocKind;
  docId: string;
  reference: string;
  eventType: LedgerEventType;
  summary: string;
  staffId?: string;
  amount?: number;
  paymentId?: string;
}

export interface SaleLine {
  itemId: string;
  qty: number;
  unitSellPrice: number;
  unitBuyPrice: number;
  discountPercent: number;
  discountAmountUgx: number;
}

export interface SaleRecord {
  id: string;
  reference: string;
  vendorShopId: string;
  soldAt: string;
  lines: SaleLine[];
}

export interface InboundLine {
  itemId: string;
  category: string;
  qty: number;
  unit: QuantityUnit;
  buyPrice: number;
  sellPrice: number;
  discountPercent: number;
  expectedIncome: number;
  netProfit: number;
}

export interface InboundReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseId?: string;
  status: DocumentStatus;
  lines: InboundLine[];
  lineCount: number;
  receivedAt?: string;
}

export interface DistributionLine {
  itemId: string;
  qtyRequested: number;
  unit: QuantityUnit;
}

export interface DistributionOrder {
  id: string;
  batchNumber: string;
  vendorShopId: string;
  agentStaffId: string;
  deliveryLocation: string;
  contactName: string;
  contactPhone: string;
  paymentTerms: string;
  totalDue: number;
  amountPaid: number;
  dueDate: string;
  sendReminders: boolean;
  preferredPaymentMethod: PaymentMethod;
  lines: DistributionLine[];
  status: DocumentStatus;
  createdAt: string;
}

/** @deprecated demo batches — use DistributionOrder */
export interface DistributionBatch {
  id: string;
  batchNumber: string;
  assignedTo: string;
  status: DocumentStatus;
  itemCount: number;
  committedAt?: string;
}

export interface VendorDelivery {
  id: string;
  deliveryNumber: string;
  vendorName: string;
  agentName: string;
  status: DocumentStatus;
  total: number;
  deliveredAt?: string;
}

export interface CashTransaction {
  id: string;
  direction: "in" | "out";
  amount: number;
  category: string;
  memo: string;
  occurredAt: string;
}

export interface DashboardStats {
  itemsInStock: number;
  lowStockCount: number;
  pendingInbound: number;
  activeBatches: number;
  deliveriesToday: number;
  cashInWeek: number;
  cashOutWeek: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

/** @deprecated use StaffMember */
export interface Person extends StaffMember {
  activeBatches: number;
}
