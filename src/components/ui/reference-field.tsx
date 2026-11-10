import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form-field";
import type { ReferenceKind } from "@/lib/reference-numbers";

export function ReferenceField({
  label,
  value,
  onChange,
  onRegenerate,
  kind,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onRegenerate: () => void;
  kind: ReferenceKind;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex gap-2">
        <input
          className={`${inputClass} font-mono text-xs`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${kind}-…`}
        />
        <Button type="button" variant="secondary" className="shrink-0 px-3 text-xs" onClick={onRegenerate}>
          New
        </Button>
      </div>
    </label>
  );
}
