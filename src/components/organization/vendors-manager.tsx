"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useFinance } from "@/lib/finance-context";
import { useSession } from "@/lib/session-context";
import { staffDisplayName } from "@/lib/permissions";
import { formatMoney } from "@/lib/locale";
import type { VendorShop } from "@/lib/types";

const empty: Omit<VendorShop, "id"> = {
  name: "",
  region: "",
  contactName: "",
  phone: "",
  assignedStaffId: "",
};

export function VendorsManager() {
  const { vendors, staff, addVendor, updateVendor, removeVendor, staffName } =
    useOrganization();
  const { items } = useInventory();
  const { vendorDiscounts, upsertVendorDiscount, removeVendorDiscount } =
    useFinance();
  const { can } = useSession();
  const canVendors = can("vendors");
  const canDiscounts = can("discounts");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<VendorShop | null>(null);
  const [form, setForm] = useState(empty);
  const [discountVendorId, setDiscountVendorId] = useState<string | null>(null);
  const [discItemId, setDiscItemId] = useState("");
  const [discPercent, setDiscPercent] = useState(0);
  const [discAmount, setDiscAmount] = useState(0);

  const agents = staff.filter(
    (s) => s.role === "field_agent" || s.role === "section_admin",
  );

  const vendorDiscountRows = useMemo(() => {
    if (!discountVendorId) return [];
    return vendorDiscounts.filter((d) => d.vendorShopId === discountVendorId);
  }, [discountVendorId, vendorDiscounts]);

  const saveVendor = () => {
    if (!form.name.trim() || !form.assignedStaffId) return;
    if (edit) updateVendor(edit.id, form);
    else addVendor(form);
    setOpen(false);
  };

  const saveDiscount = () => {
    if (!discountVendorId || !discItemId) return;
    upsertVendorDiscount({
      vendorShopId: discountVendorId,
      itemId: discItemId,
      discountPercent: discPercent,
      discountAmountUgx: discAmount,
    });
    setDiscItemId("");
    setDiscPercent(0);
    setDiscAmount(0);
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        tone="sky"
        title="Vendor shops"
        description="Shops you supply. Sales admin manages shops and per-vendor discounts (% and UGX per unit)."
        action={
          canVendors ? (
            <Button onClick={() => { setEdit(null); setForm({ ...empty, assignedStaffId: agents[0]?.id ?? "" }); setOpen(true); }}>
              Add shop
            </Button>
          ) : (
            <span className="text-xs text-slate-500">Sales admin only</span>
          )
        }
      />
      <DataTable columns={["Shop", "Region", "Contact", "Assigned to", ""]}>
        {vendors.map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3 font-medium">{v.name}</td>
            <td className="px-4 py-3">{v.region}</td>
            <td className="px-4 py-3">
              {v.contactName}
              <span className="block text-xs text-slate-400">{v.phone}</span>
            </td>
            <td className="px-4 py-3">{staffName(v.assignedStaffId)}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {canVendors ? (
                  <>
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => { setEdit(v); setForm({ name: v.name, region: v.region, contactName: v.contactName, phone: v.phone, assignedStaffId: v.assignedStaffId }); setOpen(true); }}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => removeVendor(v.id)}>
                      Delete
                    </Button>
                  </>
                ) : null}
                {canDiscounts ? (
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setDiscountVendorId(v.id)}>
                    Discounts
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal open={open} title={edit ? "Edit shop" : "Add shop"} onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveVendor}>Save</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Shop name" className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Region">
            <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </FormField>
          <FormField label="Assigned agent">
            <select className={inputClass} value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{staffDisplayName(a)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Contact">
            <input className={inputClass} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!discountVendorId}
        title={`Discounts — ${vendors.find((v) => v.id === discountVendorId)?.name ?? ""}`}
        onClose={() => setDiscountVendorId(null)}
        footer={<Button variant="secondary" onClick={() => setDiscountVendorId(null)}>Close</Button>}
      >
        <p className="mb-3 text-xs text-slate-600">
          Buy price vs sell price comes from inventory. Discounts reduce what the vendor pays.
        </p>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <FormField label="Item">
            <select className={inputClass} value={discItemId} onChange={(e) => setDiscItemId(e.target.value)}>
              <option value="">Select…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (buy {formatMoney(i.costPrice)}, sell {formatMoney(i.sellPrice)})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Discount %">
            <input type="number" min={0} max={100} className={inputClass} value={discPercent} onChange={(e) => setDiscPercent(Number(e.target.value))} />
          </FormField>
          <FormField label="Discount UGX (per unit)">
            <input type="number" min={0} className={inputClass} value={discAmount} onChange={(e) => setDiscAmount(Number(e.target.value))} />
          </FormField>
          <div className="self-end">
            <Button onClick={saveDiscount}>Apply discount</Button>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {vendorDiscountRows.map((d) => {
            const item = items.find((i) => i.id === d.itemId);
            return (
              <li key={d.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span>{item?.name ?? d.itemId}: {d.discountPercent}% + {formatMoney(d.discountAmountUgx)}/unit</span>
                <button type="button" className="text-xs text-red-600" onClick={() => removeVendorDiscount(d.id)}>Remove</button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}
