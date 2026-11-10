import type {
  DashboardStats,
  DistributionBatch,
  InboundReceipt,
  Notification,
  Supplier,
  VendorDelivery,
} from "./types";

export { formatMoney, formatDate, APP_COUNTRY, APP_CURRENCY } from "./locale";

export const dashboardStats: DashboardStats = {
  itemsInStock: 1842,
  lowStockCount: 7,
  pendingInbound: 2,
  activeBatches: 4,
  deliveriesToday: 11,
  cashInWeek: 48_500_000,
  cashOutWeek: 31_200_000,
};

export const suppliers: Supplier[] = [
  {
    id: "s1",
    name: "Kampala Hardware Wholesalers",
    contactName: "Joseph Nsubuga",
    phone: "+256 701 100 200",
  },
  {
    id: "s2",
    name: "Lweza Electrical Supplies",
    contactName: "Mary Kansiime",
    phone: "+256 772 300 400",
  },
];

export const inboundReceipts: InboundReceipt[] = [
  {
    id: "ir1",
    receiptNumber: "INB-2026-0142",
    supplierId: "s1",
    supplierName: "Kampala Hardware Wholesalers",
    status: "pending",
    lines: [],
    lineCount: 18,
  },
  {
    id: "ir2",
    receiptNumber: "INB-2026-0141",
    supplierId: "s2",
    supplierName: "Lweza Electrical Supplies",
    status: "completed",
    lines: [],
    lineCount: 6,
    receivedAt: "2026-11-07T14:30:00Z",
  },
];

export const distributionBatches: DistributionBatch[] = [
  {
    id: "db1",
    batchNumber: "DST-BAT-0089",
    assignedTo: "James Kato",
    status: "in_transit",
    itemCount: 12,
    committedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "db2",
    batchNumber: "DST-BAT-0090",
    assignedTo: "Amina Nalukenge",
    status: "committed",
    itemCount: 8,
    committedAt: "2026-11-08T09:15:00Z",
  },
];

export const vendorDeliveries: VendorDelivery[] = [
  {
    id: "vd1",
    deliveryNumber: "DEL-2026-3310",
    vendorName: "Riverview Hardware",
    agentName: "James Kato",
    status: "pending",
    total: 4_850_000,
  },
  {
    id: "vd2",
    deliveryNumber: "DEL-2026-3308",
    vendorName: "City Plumbing Depot",
    agentName: "Amina Nalukenge",
    status: "completed",
    total: 2_140_000,
    deliveredAt: "2026-11-08T11:20:00Z",
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "Low stock alert",
    body: "Adjustable Wrench 10in is below reorder level (38 left).",
    isRead: false,
    createdAt: "2026-11-08T08:00:00Z",
    actionUrl: "/inventory",
  },
  {
    id: "n2",
    title: "Inbound expected today",
    body: "INB-2026-0142 from Kampala Hardware Wholesalers — 18 lines.",
    isRead: false,
    createdAt: "2026-11-08T07:00:00Z",
    actionUrl: "/inbound",
  },
  {
    id: "n3",
    title: "Batch assigned",
    body: "DST-BAT-0090 committed to Amina Nalukenge.",
    isRead: true,
    createdAt: "2026-11-08T09:20:00Z",
    actionUrl: "/distribution",
  },
  {
    id: "n4",
    title: "QuickBooks sync",
    body: "Last sync succeeded. 3 invoices pushed.",
    isRead: true,
    createdAt: "2026-11-08T06:00:00Z",
    actionUrl: "/integrations",
  },
];

export function statusTone(
  status: string,
): "default" | "warning" | "success" | "danger" {
  switch (status) {
    case "completed":
    case "committed":
      return "success";
    case "pending":
    case "draft":
      return "warning";
    case "cancelled":
      return "danger";
    case "in_transit":
    case "partial":
      return "default";
    default:
      return "default";
  }
}
