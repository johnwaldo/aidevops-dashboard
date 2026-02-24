export function MetricCard({ label, value, trend }: { label: string; value: string | number; trend?: string }) {
  // TODO: Phase 1 — Stat card with label, value, trend
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <p className="text-xs text-[#71717a]">{label}</p>
      <p className="text-2xl font-mono font-semibold">{value}</p>
      {trend && <p className="text-xs text-[#71717a]">{trend}</p>}
    </div>
  );
}
