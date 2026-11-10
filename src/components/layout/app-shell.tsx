"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { APP_COUNTRY, APP_CURRENCY } from "@/lib/locale";
import { useSession } from "@/lib/session-context";
import { roleLabel, staffDisplayName } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; abbr: string };

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", abbr: "Db" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", abbr: "In" },
      { href: "/inbound", label: "Inbound", abbr: "Ib" },
      { href: "/distribution", label: "Distribution", abbr: "Ds" },
      { href: "/scan", label: "Scan", abbr: "Sc" },
      { href: "/shop", label: "DST shop", abbr: "Sh" },
    ],
  },
  {
    title: "Partners",
    items: [
      { href: "/suppliers", label: "Suppliers", abbr: "Su" },
      { href: "/vendors", label: "Vendor shops", abbr: "Vn" },
      { href: "/personnel", label: "Team & admins", abbr: "Tm" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/cashflow", label: "Cash flow", abbr: "Ca" },
      { href: "/receipts", label: "Receipts", abbr: "Rc" },
      { href: "/debtors", label: "Debtors", abbr: "Dt" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/notifications", label: "Alerts", abbr: "Al" },
      { href: "/integrations", label: "QuickBooks", abbr: "QB" },
    ],
  },
];

const mobileNav: NavItem[] = [
  { href: "/dashboard", label: "Home", abbr: "Hm" },
  { href: "/inventory", label: "Stock", abbr: "St" },
  { href: "/shop", label: "Shop", abbr: "Sh" },
  { href: "/scan", label: "Scan", abbr: "Sc" },
  { href: "/distribution", label: "Dist", abbr: "Ds" },
  { href: "/notifications", label: "Alerts", abbr: "Al" },
];

function NavLink({
  item,
  pathname,
  onNavigate,
  compact,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-white ring-1 ring-amber-400/30"
          : "text-slate-300 hover:bg-white/10 hover:text-white",
        compact && "justify-center px-2",
      )}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold tracking-tight"
        aria-hidden
      >
        {item.abbr}
      </span>
      {!compact ? <span>{item.label}</span> : null}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, setUserId, users } = useSession();

  return (
  <>
    <div className="px-4 py-5">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-500/30">
          DST
        </span>
        <div>
          <p className="text-sm font-semibold text-white">DST Hardware</p>
          <p className="text-xs text-slate-400">Inventory · {APP_COUNTRY}</p>
        </div>
      </Link>
    </div>

    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>

    <div className="border-t border-white/10 p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Signed in
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-white">
        {staffDisplayName(user)}
      </p>
      <p className="text-xs text-slate-400">{roleLabel(user.role)}</p>
      {user.role === "super_admin" ? (
        <span className="mt-2 inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          Full access
        </span>
      ) : null}
      <label className="mt-3 block">
        <span className="text-[10px] text-slate-500">Switch user (demo)</span>
        <select
          value={user.id}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {staffDisplayName(u)}
            </option>
          ))}
        </select>
      </label>
    </div>
  </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle =
    navSections
      .flatMap((s) => s.items)
      .find((i) => i.href === pathname)?.label ?? "DST Hardware";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(280px,85vw)] flex-col bg-[#0f172a] shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div>
              <p className="truncate text-sm font-semibold text-slate-900">{pageTitle}</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {APP_COUNTRY} · {APP_CURRENCY}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[200px] truncate text-xs font-medium text-slate-600 sm:inline">
              {staffDisplayName(user)}
            </span>
            <Link
              href="/notifications"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Alerts
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden"
        aria-label="Mobile"
      >
        <ul className="grid grid-cols-5">
          {mobileNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center py-2.5 text-[10px] font-medium",
                  pathname === item.href
                    ? "text-amber-800"
                    : "text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold",
                    pathname === item.href
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600",
                  )}
                  aria-hidden
                >
                  {item.abbr}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
