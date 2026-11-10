"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PanelCard } from "@/components/ui/panel-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormField, inputClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useOperations } from "@/lib/operations-context";
import { useFinance } from "@/lib/finance-context";
import { useSession } from "@/lib/session-context";
import { formatDate, formatMoney } from "@/lib/locale";
import { staffDisplayName, canManageOtherAdmins } from "@/lib/permissions";
import {
  PAYMENT_METHODS,
  QUANTITY_UNITS,
  paymentMethodLabel,
  quantityUnitLabel,
} from "@/lib/payment-labels";
import { nextReference } from "@/lib/reference-numbers";
import { DistributionOrderDetail } from "@/components/distribution/distribution-order-detail";
import type {
  DistributionLine,
  DistributionOrder,
  PaymentMethod,
  QuantityUnit,
  VendorShop,
} from "@/lib/types";

const emptyVendor: Omit<VendorShop, "id"> = {
  name: "",
  region: "",
  contactName: "",
  phone: "",
  assignedStaffId: "",
  deliveryLocation: "",
  paymentTerms: "Pay within 14 days",
  sendReminders: true,
  preferredPaymentMethod: "mobile_money",
};

const emptyAgent = {
  fullName: "",
  phone: "",
  region: "",
};

export function DistributionManager() {
  const {
    staff,
    vendors,
    addVendor,
    addStaff,
    updateVendor,
    staffName,
  } = useOrganization();
  const { items } = useInventory();
  const { distributions, createDistribution, distributionBalance } = useOperations();
  const { addPayment } = useFinance();
  const { user, can } = useSession();

  const canEdit =
    can("vendors") || can("catalog") || canManageOtherAdmins(user);
  const canAddAgent = canManageOtherAdmins(user);

  const agents = staff.filter(
    (p) => p.role === "field_agent" && p.isActive,
  );

  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const vendor = vendors.find((v) => v.id === vendorId);

  const [agentId, setAgentId] = useState(vendor?.assignedStaffId ?? agents[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Pay within 14 days");
  const [dueDate, setDueDate] = useState("");
  const [sendReminders, setSendReminders] = useState(true);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mobile_money");
  const [amountPaid, setAmountPaid] = useState(0);

  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<QuantityUnit>("ea");
  const [lines, setLines] = useState<DistributionLine[]>([]);

  const [vendorOpen, setVendorOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [agentForm, setAgentForm] = useState(emptyAgent);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFallback, setDetailFallback] = useState<DistributionOrder | null>(
    null,
  );

  const openDetail = (id: string, fallback?: DistributionOrder | null) => {
    setDetailFallback(fallback ?? null);
    setDetailId(id);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (!vendor) return;
    setAgentId(vendor.assignedStaffId || agentId);
    setLocation(vendor.deliveryLocation ?? `${vendor.name}, ${vendor.region}`);
    setContactName(vendor.contactName);
    setContactPhone(vendor.phone);
    setPaymentTerms(vendor.paymentTerms ?? "Pay within 14 days");
    setSendReminders(vendor.sendReminders ?? true);
    setPayMethod(vendor.preferredPaymentMethod ?? "mobile_money");
  }, [vendorId, vendor]);

  const totalDue = useMemo(() => {
    return lines.reduce((s, l) => {
      const it = items.find((i) => i.id === l.itemId);
      return s + l.qtyRequested * (it?.sellPrice ?? 0);
    }, 0);
  }, [lines, items]);

  const addLine = () => {
    if (qty <= 0) return;
    setLines((p) => [...p, { itemId, qtyRequested: qty, unit }]);
    setQty(1);
  };

  const createBatch = () => {
    if (!vendor || !vendorId || !agentId || lines.length === 0) return;
    const order = createDistribution({
      vendorShopId: vendorId,
      agentStaffId: agentId,
      deliveryLocation: location,
      contactName,
      contactPhone,
      paymentTerms,
      totalDue,
      amountPaid,
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
      sendReminders,
      preferredPaymentMethod: payMethod,
      lines,
      recordedByStaffId: user.id,
    });

    if (!vendor) return;
    updateVendor(vendorId, {
      ...vendor,
      assignedStaffId: agentId,
      deliveryLocation: location,
      contactName,
      phone: contactPhone,
      paymentTerms,
      sendReminders,
      preferredPaymentMethod: payMethod,
      nextDueDate: order.dueDate,
      balanceDue: distributionBalance(order),
    });

    if (amountPaid > 0) {
      addPayment({
        reference: nextReference("PAY"),
        direction: "in",
        amount: amountPaid,
        category: "Vendor collection",
        memo: `${order.batchNumber} · ${vendor.name}`,
        occurredAt: new Date().toISOString(),
        vendorShopId: vendorId,
        distributionOrderId: order.id,
        paymentMethod: payMethod,
        receivedByStaffId: user.id,
      });
    }

    setLines([]);
    setAmountPaid(0);
    openDetail(order.id, order);
  };

  const saveVendor = () => {
    if (!vendorForm.name.trim()) return;
    addVendor({
      ...vendorForm,
      assignedStaffId: vendorForm.assignedStaffId || agents[0]?.id || "",
    });
    setVendorOpen(false);
    setVendorForm(emptyVendor);
  };

  const saveAgent = () => {
    if (!agentForm.fullName.trim()) return;
    addStaff({
      fullName: agentForm.fullName,
      phone: agentForm.phone,
      region: agentForm.region || "Field route",
      role: "field_agent",
      isActive: true,
    });
    setAgentOpen(false);
    setAgentForm(emptyAgent);
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageHeader
        tone="sky"
        title="Distribution to vendor shops"
        description="Select vendor & agent, items requested, saved location & contacts, payment terms, balance, reminders. Batch number is generated automatically."
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setVendorOpen(true)}>
                Add vendor
              </Button>
              {canAddAgent ? (
                <Button variant="secondary" onClick={() => setAgentOpen(true)}>
                  Add agent
                </Button>
              ) : null}
              <Button onClick={createBatch} disabled={lines.length === 0}>
                Create distribution
              </Button>
            </div>
          ) : null
        }
      />

      {canEdit ? (
        <PanelCard tone="sky" title="New distribution">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Vendor shop">
              <select
                className={inputClass}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.region}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Field agent">
              <select
                className={inputClass}
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {staffDisplayName(a)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Delivery location (saved next time)">
              <input
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </FormField>
            <FormField label="Contact name">
              <input
                className={inputClass}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </FormField>
            <FormField label="Contact phone">
              <input
                className={inputClass}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </FormField>
            <FormField label="Payment terms">
              <input
                className={inputClass}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </FormField>
            <FormField label="Due date (when to pay)">
              <input
                type="date"
                className={inputClass}
                value={dueDate ? dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  setDueDate(new Date(e.target.value).toISOString())
                }
              />
            </FormField>
            <FormField label="Means of payment">
              <select
                className={inputClass}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Cash received now">
              <input
                type="number"
                className={inputClass}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={sendReminders}
                onChange={(e) => setSendReminders(e.target.checked)}
              />
              Send payment reminders before due date
            </label>
          </div>

          <ItemsRequestBlock
            itemId={itemId}
            setItemId={setItemId}
            items={items}
            qty={qty}
            setQty={setQty}
            unit={unit}
            setUnit={setUnit}
            addLine={addLine}
            lines={lines}
            setLines={setLines}
            totalDue={totalDue}
            amountPaid={amountPaid}
          />
        </PanelCard>
      ) : null}

      <PanelCard tone="sky" title="Distribution commitments" noPadding>
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          Tap a row to open full commitment details.
        </p>
      <DataTable
        columns={[
          "Batch",
          "Vendor",
          "Agent",
          "Total",
          "Balance",
          "Due",
          "Status",
        ]}
        className="rounded-none border-0 shadow-none"
      >
        {distributions.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-4 py-8 text-center text-sm text-slate-500"
            >
              No distributions yet. Create one above.
            </td>
          </tr>
        ) : (
        distributions.map((d) => {
          const bal = distributionBalance(d);
          const v = vendors.find((x) => x.id === d.vendorShopId);
          return (
            <tr
              key={d.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-colors hover:bg-sky-50/80 focus-visible:bg-sky-50 focus-visible:outline-none"
              onClick={() => openDetail(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDetail(d.id);
                }
              }}
            >
              <td className="px-4 py-3 font-medium">{d.batchNumber}</td>
              <td className="px-4 py-3">{v?.name ?? "—"}</td>
              <td className="px-4 py-3 text-sm">{staffName(d.agentStaffId)}</td>
              <td className="px-4 py-3">{formatMoney(d.totalDue)}</td>
              <td className="px-4 py-3 font-medium text-violet-800">
                {formatMoney(bal)}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {formatDate(d.dueDate)}
                {d.sendReminders ? " · reminders on" : ""}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={d.status} />
              </td>
            </tr>
          );
        })
        )}
      </DataTable>
      </PanelCard>

      <DistributionOrderDetail
        orderId={detailId}
        fallbackOrder={detailFallback}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
          setDetailFallback(null);
        }}
      />

      <Modal
        open={vendorOpen}
        title="Add vendor shop"
        onClose={() => setVendorOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVendorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVendor}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Shop name" className="sm:col-span-2">
            <input
              className={inputClass}
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
            />
          </FormField>
          <FormField label="Region">
            <input
              className={inputClass}
              value={vendorForm.region}
              onChange={(e) => setVendorForm({ ...vendorForm, region: e.target.value })}
            />
          </FormField>
          <FormField label="Contact">
            <input
              className={inputClass}
              value={vendorForm.contactName}
              onChange={(e) =>
                setVendorForm({ ...vendorForm, contactName: e.target.value })
              }
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={agentOpen}
        title="Add field agent"
        onClose={() => setAgentOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAgentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAgent}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <FormField label="Full name">
            <input
              className={inputClass}
              value={agentForm.fullName}
              onChange={(e) => setAgentForm({ ...agentForm, fullName: e.target.value })}
            />
          </FormField>
          <FormField label="Phone">
            <input
              className={inputClass}
              value={agentForm.phone}
              onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

function ItemsRequestBlock({
  itemId,
  setItemId,
  items,
  qty,
  setQty,
  unit,
  setUnit,
  addLine,
  lines,
  setLines,
  totalDue,
  amountPaid,
}: {
  itemId: string;
  setItemId: (v: string) => void;
  items: { id: string; name: string }[];
  qty: number;
  setQty: (v: number) => void;
  unit: QuantityUnit;
  setUnit: (v: QuantityUnit) => void;
  addLine: () => void;
  lines: DistributionLine[];
  setLines: (fn: (p: DistributionLine[]) => DistributionLine[]) => void;
  totalDue: number;
  amountPaid: number;
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h4 className="text-sm font-bold text-slate-900">Items requested</h4>
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          className={`${inputClass} max-w-xs`}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          className={`${inputClass} w-24`}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
        <select
          className={`${inputClass} w-36`}
          value={unit}
          onChange={(e) => setUnit(e.target.value as QuantityUnit)}
        >
          {QUANTITY_UNITS.map((u) => (
            <option key={u} value={u}>
              {quantityUnitLabel(u)}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={addLine}>
          Add item
        </Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {lines.map((l, idx) => {
          const name = items.find((i) => i.id === l.itemId)?.name ?? l.itemId;
          return (
            <li key={`${l.itemId}-${idx}`} className="flex justify-between">
              <span>
                {name} · {l.qtyRequested} {l.unit}
              </span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm">
        <strong>Order total:</strong> {formatMoney(totalDue)} ·{" "}
        <strong>Balance after payment:</strong>{" "}
        {formatMoney(Math.max(0, totalDue - amountPaid))}
      </p>
    </div>
  );
}
