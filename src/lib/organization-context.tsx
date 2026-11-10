"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { staffDisplayName } from "./permissions";
import type {
  AdminSection,
  AppRole,
  StaffMember,
  Supplier,
  SupplierItemLink,
  VendorShop,
} from "./types";

const STORAGE_KEY = "dst-organization-v1";

type StaffInput = Omit<StaffMember, "id" | "isActive"> & { isActive?: boolean };

function seedStaff(): StaffMember[] {
  return [
    {
      id: "super-1",
      fullName: "Walukagga Admin",
      phone: "+256 700 000 001",
      role: "super_admin",
      region: "Head office",
      isActive: true,
    },
    {
      id: "sec-wh",
      fullName: "Grace Nakato",
      phone: "+256 701 001",
      role: "section_admin",
      section: "warehouse",
      region: "DST Hub",
      isActive: true,
    },
    {
      id: "sec-pr",
      fullName: "Joseph Ouma",
      phone: "+256 701 010",
      role: "section_admin",
      section: "procurement",
      region: "Procurement",
      isActive: true,
    },
    {
      id: "sec-sl",
      fullName: "Amina Nalukenge",
      phone: "+256 701 003",
      role: "section_admin",
      section: "sales",
      region: "Central routes",
      isActive: true,
    },
    {
      id: "sec-fn",
      fullName: "David Ssemakula",
      phone: "+256 701 004",
      role: "section_admin",
      section: "finance",
      region: "Finance office",
      isActive: true,
    },
    {
      id: "ag-1",
      fullName: "James Kato",
      phone: "+256 701 002",
      role: "field_agent",
      region: "North / East",
      isActive: true,
    },
  ];
}

function seedSuppliers(): Supplier[] {
  return [
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
}

function seedVendors(): VendorShop[] {
  return [
    {
      id: "v1",
      name: "Riverview Hardware",
      region: "North",
      contactName: "Tom Okello",
      phone: "+256 700 111",
      assignedStaffId: "ag-1",
    },
    {
      id: "v2",
      name: "Sunrise Builders Mart",
      region: "East",
      contactName: "Sarah Nabwire",
      phone: "+256 700 222",
      assignedStaffId: "ag-1",
    },
    {
      id: "v3",
      name: "City Plumbing Depot",
      region: "Central",
      contactName: "Peter Mugisha",
      phone: "+256 700 333",
      assignedStaffId: "ag-1",
    },
  ];
}

function seedSupplierCatalog(): SupplierItemLink[] {
  return [
    { id: "sc-1", supplierId: "s1", itemId: "1" },
    { id: "sc-2", supplierId: "s1", itemId: "4" },
    { id: "sc-3", supplierId: "s1", itemId: "cem-32" },
    { id: "sc-4", supplierId: "s1", itemId: "cem-42" },
    { id: "sc-5", supplierId: "s2", itemId: "3" },
  ];
}

type OrgState = {
  staff: StaffMember[];
  suppliers: Supplier[];
  vendors: VendorShop[];
  supplierCatalog: SupplierItemLink[];
};

type OrganizationContextValue = OrgState & {
  addSupplier: (input: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, input: Omit<Supplier, "id">) => void;
  removeSupplier: (id: string) => void;
  linkSupplierItem: (supplierId: string, itemId: string) => void;
  unlinkSupplierItem: (supplierId: string, itemId: string) => void;
  syncSupplierItems: (supplierId: string, itemIds: string[]) => void;
  itemsForSupplier: (supplierId: string) => string[];
  addVendor: (input: Omit<VendorShop, "id">) => void;
  updateVendor: (id: string, input: Omit<VendorShop, "id">) => void;
  removeVendor: (id: string) => void;
  addStaff: (input: StaffInput) => void;
  updateStaff: (id: string, input: StaffInput) => void;
  removeStaff: (id: string) => void;
  staffName: (id: string) => string;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OrgState>({
    staff: seedStaff(),
    suppliers: seedSuppliers(),
    vendors: seedVendors(),
    supplierCatalog: seedSupplierCatalog(),
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OrgState>;
        setState({
          staff: parsed.staff ?? seedStaff(),
          suppliers: parsed.suppliers ?? seedSuppliers(),
          vendors: parsed.vendors ?? seedVendors(),
          supplierCatalog: parsed.supplierCatalog ?? seedSupplierCatalog(),
        });
      }
    } catch {
      /* seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const staffName = useCallback(
    (id: string) => {
      const m = state.staff.find((s) => s.id === id);
      return m ? staffDisplayName(m) : "—";
    },
    [state.staff],
  );

  const addSupplier = useCallback((input: Omit<Supplier, "id">) => {
    const created: Supplier = { ...input, id: crypto.randomUUID() };
    setState((s) => ({
      ...s,
      suppliers: [...s.suppliers, created],
    }));
    return created;
  }, []);

  const updateSupplier = useCallback(
    (id: string, input: Omit<Supplier, "id">) => {
      setState((s) => ({
        ...s,
        suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...input } : x)),
      }));
    },
    [],
  );

  const removeSupplier = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      suppliers: s.suppliers.filter((x) => x.id !== id),
      supplierCatalog: s.supplierCatalog.filter((l) => l.supplierId !== id),
    }));
  }, []);

  const linkSupplierItem = useCallback((supplierId: string, itemId: string) => {
    setState((s) => {
      if (
        s.supplierCatalog.some(
          (l) => l.supplierId === supplierId && l.itemId === itemId,
        )
      ) {
        return s;
      }
      return {
        ...s,
        supplierCatalog: [
          ...s.supplierCatalog,
          { id: crypto.randomUUID(), supplierId, itemId },
        ],
      };
    });
  }, []);

  const unlinkSupplierItem = useCallback((supplierId: string, itemId: string) => {
    setState((s) => ({
      ...s,
      supplierCatalog: s.supplierCatalog.filter(
        (l) => !(l.supplierId === supplierId && l.itemId === itemId),
      ),
    }));
  }, []);

  const syncSupplierItems = useCallback((supplierId: string, itemIds: string[]) => {
    const unique = [...new Set(itemIds)];
    setState((s) => {
      const others = s.supplierCatalog.filter((l) => l.supplierId !== supplierId);
      const links: SupplierItemLink[] = unique.map((itemId) => ({
        id: crypto.randomUUID(),
        supplierId,
        itemId,
      }));
      return { ...s, supplierCatalog: [...others, ...links] };
    });
  }, []);

  const itemsForSupplier = useCallback(
    (supplierId: string) =>
      state.supplierCatalog
        .filter((l) => l.supplierId === supplierId)
        .map((l) => l.itemId),
    [state.supplierCatalog],
  );

  const addVendor = useCallback((input: Omit<VendorShop, "id">) => {
    setState((s) => ({
      ...s,
      vendors: [...s.vendors, { ...input, id: crypto.randomUUID() }],
    }));
  }, []);

  const updateVendor = useCallback(
    (id: string, input: Omit<VendorShop, "id">) => {
      setState((s) => ({
        ...s,
        vendors: s.vendors.map((x) => (x.id === id ? { ...x, ...input } : x)),
      }));
    },
    [],
  );

  const removeVendor = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      vendors: s.vendors.filter((x) => x.id !== id),
    }));
  }, []);

  const addStaff = useCallback((input: StaffInput) => {
    setState((s) => ({
      ...s,
      staff: [
        ...s.staff,
        {
          ...input,
          id: crypto.randomUUID(),
          isActive: input.isActive ?? true,
        },
      ],
    }));
  }, []);

  const updateStaff = useCallback((id: string, input: StaffInput) => {
    setState((s) => ({
      ...s,
      staff: s.staff.map((m) =>
        m.id === id
          ? { ...m, ...input, isActive: input.isActive ?? m.isActive }
          : m,
      ),
    }));
  }, []);

  const removeStaff = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      staff: s.staff.filter((m) => m.id !== id),
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      addSupplier,
      updateSupplier,
      removeSupplier,
      linkSupplierItem,
      unlinkSupplierItem,
      syncSupplierItems,
      itemsForSupplier,
      addVendor,
      updateVendor,
      removeVendor,
      addStaff,
      updateStaff,
      removeStaff,
      staffName,
    }),
    [
      state,
      addSupplier,
      updateSupplier,
      removeSupplier,
      linkSupplierItem,
      unlinkSupplierItem,
      syncSupplierItems,
      itemsForSupplier,
      addVendor,
      updateVendor,
      removeVendor,
      addStaff,
      updateStaff,
      removeStaff,
      staffName,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}

export type { AdminSection, AppRole };
