export function GaugeRing({ value, max, label }: { value: number; max: number; label: string }) {
  // TODO: Phase 1 — Circular progress gauge
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-12 w-12 rounded-full border-2 border-[#1e1e2e] flex items-center justify-center">
        <span className="text-xs font-mono">{Math.round((value / max) * 100)}%</span>
      </div>
      <span className="text-xs text-[#71717a]">{label}</span>
    </div>
  );
}
