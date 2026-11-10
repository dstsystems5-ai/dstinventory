"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useInventory } from "@/lib/inventory-context";

export default function ScanPage() {
  const { items } = useInventory();
  const [code, setCode] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = code.trim();
    if (!t) return;
    const item = items.find(
      (i) => i.barcode === t || i.sku.toLowerCase() === t.toLowerCase(),
    );
    setLog((p) =>
      [(item ? `OK: ${item.name}` : `Unknown: ${t}`), ...p].slice(0, 15),
    );
    setCode("");
    ref.current?.focus();
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="Scan"
        description="USB scanner or type a barcode — works on phone and desktop."
      />
      <input
        ref={ref}
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-lg shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
        placeholder="Barcode / SKU"
      />
      <ul className="mt-4 space-y-1 text-sm text-slate-700">
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
