export type ReferenceKind =
  | "PO"
  | "PAY"
  | "SALE"
  | "SHOP"
  | "DEL"
  | "SKU"
  | "INB"
  | "STF"
  | "BAT"
  | "INV";

const STORAGE_KEY = "dst-reference-counters";

function readCounters(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function writeCounters(counters: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
}

/** e.g. PAY-2026-00042 */
export function nextReference(kind: ReferenceKind): string {
  const year = new Date().getFullYear();
  const counters = readCounters();
  const key = `${kind}-${year}`;
  const seq = (counters[key] ?? 0) + 1;
  counters[key] = seq;
  writeCounters(counters);
  return `${kind}-${year}-${String(seq).padStart(5, "0")}`;
}

export function referenceReadOnlyHint(kind: ReferenceKind): string {
  return `Auto: ${kind}-${new Date().getFullYear()}-#####`;
}
