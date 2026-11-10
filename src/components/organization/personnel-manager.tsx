"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { useOrganization, type AdminSection, type AppRole } from "@/lib/organization-context";
import { useSession } from "@/lib/session-context";
import { roleLabel, sectionLabel, staffDisplayName } from "@/lib/permissions";
import type { StaffMember } from "@/lib/types";

type StaffForm = {
  fullName: string;
  phone: string;
  email: string;
  role: AppRole;
  section?: AdminSection;
  region: string;
};

const emptyForm: StaffForm = {
  fullName: "",
  phone: "",
  email: "",
  role: "field_agent",
  section: "warehouse",
  region: "",
};

export function PersonnelManager() {
  const { staff, addStaff, updateStaff, removeStaff } = useOrganization();
  const { canManageAdmins, user } = useSession();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = (target: StaffMember) => {
    if (!canManageAdmins) return false;
    if (target.role === "super_admin" && target.id !== user.id) return false;
    return true;
  };

  const startAdd = () => {
    setEdit(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (m: StaffMember) => {
    setEdit(m);
    setForm({
      fullName: m.fullName,
      phone: m.phone,
      email: m.email ?? "",
      role: m.role,
      section: m.section,
      region: m.region,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.fullName.trim()) return;
    if (form.role === "section_admin" && !form.section) return;
    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      role: form.role,
      section: form.role === "section_admin" ? form.section : undefined,
      region: form.region,
    };
    if (edit) updateStaff(edit.id, payload);
    else addStaff(payload);
    setOpen(false);
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        tone="slate"
        title="Team & admins"
        description="Super admin assigns section admins (warehouse, procurement, sales, finance) to manage their dashboards. Section admins cannot create other admins."
        action={
          canManageAdmins ? (
            <Button onClick={startAdd}>Add team member</Button>
          ) : (
            <span className="text-xs text-slate-500">Super admin only</span>
          )
        }
      />
      <DataTable columns={["Name", "Role", "Section / dashboard", "Region", "Phone", ""]}>
        {staff.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3 font-medium">{staffDisplayName(m)}</td>
            <td className="px-4 py-3">{roleLabel(m.role)}</td>
            <td className="px-4 py-3 text-slate-600">
              {m.section ? sectionLabel(m.section) : "—"}
            </td>
            <td className="px-4 py-3">{m.region}</td>
            <td className="px-4 py-3 text-slate-600">{m.phone}</td>
            <td className="px-4 py-3">
              {canEdit(m) ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => startEdit(m)}>
                    Edit
                  </Button>
                  {m.role !== "super_admin" ? (
                    <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => removeStaff(m.id)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal
        open={open}
        title={edit ? "Edit member" : "Add member"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Full name" className="sm:col-span-2">
            <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
            >
              <option value="section_admin">Section admin</option>
              <option value="field_agent">Field agent</option>
              <option value="warehouse_manager">Warehouse manager</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
          </FormField>
          {form.role === "section_admin" ? (
            <FormField label="Dashboard section">
              <select
                className={inputClass}
                value={form.section ?? "warehouse"}
                onChange={(e) => setForm({ ...form, section: e.target.value as AdminSection })}
              >
                <option value="warehouse">Warehouse & stock</option>
                <option value="procurement">Suppliers & buying</option>
                <option value="sales">Vendors & sales</option>
                <option value="finance">Cash & payments</option>
              </select>
            </FormField>
          ) : null}
          <FormField label="Region">
            <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
