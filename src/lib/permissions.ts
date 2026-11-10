import type { AdminSection, AppRole, StaffMember } from "./types";

export type PermissionKey =
  | "catalog"
  | "suppliers"
  | "vendors"
  | "staff"
  | "finance"
  | "discounts"
  | "shop";

const SECTION_MAP: Record<AdminSection, PermissionKey[]> = {
  warehouse: ["catalog", "shop"],
  procurement: ["suppliers"],
  sales: ["vendors", "discounts", "shop"],
  finance: ["finance"],
};

function isSuperAdmin(role: AppRole): boolean {
  return role === "super_admin";
}

function sectionPerms(section: AdminSection): PermissionKey[] {
  return SECTION_MAP[section] ?? [];
}

export function hasPermission(
  user: Pick<StaffMember, "role" | "section">,
  key: PermissionKey,
): boolean {
  if (isSuperAdmin(user.role)) return true;
  if (user.role === "section_admin" && user.section) {
    return sectionPerms(user.section).includes(key);
  }
  if (key === "catalog" && user.role === "warehouse_manager") return true;
  if (key === "finance" && user.role === "accountant") return true;
  return false;
}

export function canManageOtherAdmins(
  user: Pick<StaffMember, "role">,
): boolean {
  return isSuperAdmin(user.role);
}

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    super_admin: "Super admin",
    section_admin: "Section admin",
    warehouse_manager: "Warehouse",
    field_agent: "Field agent",
    accountant: "Accountant",
    viewer: "Viewer",
  };
  return labels[role];
}

export function sectionLabel(section: AdminSection): string {
  const labels: Record<AdminSection, string> = {
    warehouse: "Warehouse & stock",
    procurement: "Suppliers & buying",
    sales: "Vendors, shop & sales",
    finance: "Cash & payments",
  };
  return labels[section];
}

/** Name shown in admin UI — section is part of the label for admins. */
export function staffDisplayName(
  member: Pick<StaffMember, "fullName" | "role" | "section">,
): string {
  if (member.role === "super_admin") {
    return `${member.fullName} · All sections`;
  }
  if (member.role === "section_admin" && member.section) {
    return `${member.fullName} · ${sectionLabel(member.section)}`;
  }
  if (
    member.role === "warehouse_manager" ||
    member.role === "accountant" ||
    member.role === "field_agent"
  ) {
    return `${member.fullName} · ${roleLabel(member.role)}`;
  }
  return member.fullName;
}
