"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hasPermission, canManageOtherAdmins, type PermissionKey } from "./permissions";
import { useOrganization } from "./organization-context";
import type { StaffMember } from "./types";

type SessionContextValue = {
  user: StaffMember;
  setUserId: (id: string) => void;
  users: StaffMember[];
  can: (key: PermissionKey) => boolean;
  canManageAdmins: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_KEY = "dst-session-user-id";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { staff } = useOrganization();
  const [userId, setUserIdState] = useState("super-1");

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved && staff.some((s) => s.id === saved)) setUserIdState(saved);
  }, [staff]);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    localStorage.setItem(SESSION_KEY, id);
  }, []);

  const user = useMemo(
    () => staff.find((s) => s.id === userId) ?? staff[0],
    [staff, userId],
  );

  const can = useCallback(
    (key: PermissionKey) => hasPermission(user, key),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      setUserId,
      users: staff.filter((s) => s.isActive),
      can,
      canManageAdmins: canManageOtherAdmins(user),
    }),
    [user, setUserId, staff, can],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** @deprecated use can('catalog') */
export function useLegacyAdmin() {
  const { can } = useSession();
  return { canManageItems: can("catalog"), isAdmin: can("catalog") };
}
