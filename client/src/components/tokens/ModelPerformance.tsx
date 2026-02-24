import { tokensMock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ModelPerformance() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Model Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              <th className="text-left py-2 px-2 font-medium text-[#71717a]">Model</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Requests</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Success</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Avg</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">p95</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">p99</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Retries</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Timeouts</th>
            </tr>
          </thead>
          <tbody>
            {tokensMock.modelPerformance.map((m) => {
              const byModel = tokensMock.byModel.find((b) => b.model === m.model);
              const successColor = m.success >= 99.5 ? "text-emerald-400" : m.success >= 98 ? "text-amber-400" : "text-rose-400";

              return (
                <tr key={m.model} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20">
                  <td className="py-2 px-2 font-mono text-[#e4e4e7]">{m.model}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{byModel?.requests ?? "—"}</td>
                  <td className={cn("py-2 px-2 font-mono text-right font-semibold", successColor)}>{m.success}%</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.avgLatency}ms</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.p95}ms</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.p99}ms</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.retries}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.timeouts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
