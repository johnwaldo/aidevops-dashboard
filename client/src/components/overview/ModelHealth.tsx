import { tokensMock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ModelHealth() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Model Health</h3>
      <div className="space-y-2.5">
        {tokensMock.modelPerformance.map((m) => {
          const successColor =
            m.success >= 99.5 ? "text-emerald-400" : m.success >= 98 ? "text-amber-400" : "text-rose-400";
          const latencyColor =
            m.avgLatency < 500 ? "text-emerald-400" : m.avgLatency < 2000 ? "text-cyan-400" : "text-amber-400";

          return (
            <div key={m.model} className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#e4e4e7] w-36 truncate">{m.model}</span>
              <div className="flex-1 flex items-center gap-3">
                <span className={cn("text-xs font-mono font-semibold", successColor)}>
                  {m.success}%
                </span>
                <div className="flex-1 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000", {
                      "bg-emerald-500": m.success >= 99.5,
                      "bg-amber-500": m.success >= 98 && m.success < 99.5,
                      "bg-rose-500": m.success < 98,
                    })}
                    style={{ width: `${m.success}%` }}
                  />
                </div>
                <span className={cn("text-[10px] font-mono", latencyColor)}>
                  {m.avgLatency}ms
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
