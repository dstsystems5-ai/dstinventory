"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { TabBar } from "@/components/ui/tabs";
import { SupplierOrderWorkflow } from "@/components/procurement/supplier-order-workflow";
import { SupplierItemsEditor } from "@/components/procurement/supplier-items-editor";
import { useOrganization } from "@/lib/organization-context";
import { useInventory } from "@/lib/inventory-context";
import { useSession } from "@/lib/session-context";
import type { Supplier } from "@/lib/types";

const empty: Omit<Supplier, "id"> = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
};

export function SuppliersManager() {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    removeSupplier,
    itemsForSupplier,
    syncSupplierItems,
  } = useOrganization();
  const { items } = useInventory();
  const { can } = useSession();
  const allowed = can("suppliers");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [supplyItemIds, setSupplyItemIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"directory" | "orders">("orders");

  const startAdd = () => {
    setEdit(null);
    setForm(empty);
    setSupplyItemIds([]);
    setOpen(true);
  };

  const startEdit = (s: Supplier) => {
    setEdit(s);
    setForm({
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email ?? "",
      address: s.address ?? "",
    });
    setSupplyItemIds(itemsForSupplier(s.id));
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (edit) {
      updateSupplier(edit.id, form);
      syncSupplierItems(edit.id, supplyItemIds);
    } else {
      const created = addSupplier(form);
      syncSupplierItems(created.id, supplyItemIds);
    }
    setOpen(false);
  };

  const suppliesLabel = (supplierId: string) => {
    const ids = itemsForSupplier(supplierId);
    if (ids.length === 0) return "—";
    return ids
      .map((id) => items.find((i) => i.id === id)?.name ?? id)
      .slice(0, 3)
      .join(", ")
      .concat(ids.length > 3 ? ` +${ids.length - 3}` : "");
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        tone="violet"
        title="Suppliers"
        description="Main suppliers you buy stock from. Procurement admin or super admin can add and edit."
        action={
          allowed ? (
            <Button onClick={startAdd}>Add supplier</Button>
          ) : (
            <span className="text-xs text-slate-500">Procurement admin only</span>
          )
        }
      />
      <TabBar
        tone="violet"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "orders", label: "Order & invoice" },
          { id: "directory", label: "Supplier directory" },
        ]}
      />
      {tab === "orders" ? (
        <SupplierOrderWorkflow allowed={allowed} />
      ) : null}
      {tab === "directory" ? (
      <DataTable columns={["Name", "Supplies", "Contact", "Phone", ""]}>
        {suppliers.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 font-medium">{s.name}</td>
            <td className="max-w-[200px] px-4 py-3 text-xs text-slate-600">
              {suppliesLabel(s.id)}
            </td>
            <td className="px-4 py-3">{s.contactName}</td>
            <td className="px-4 py-3 text-slate-600">{s.phone}</td>
            <td className="px-4 py-3">
              {allowed ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => startEdit(s)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-600"
                    onClick={() => removeSupplier(s.id)}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>
      ) : null}
      <Modal
        open={open}
        title={edit ? "Edit supplier" : "Add supplier"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Company name" className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Contact person">
            <input className={inputClass} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <SupplierItemsEditor
              compact
              enabled={form.name.trim().length > 0}
              value={supplyItemIds}
              onChange={setSupplyItemIds}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
