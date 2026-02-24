import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { tokensMock } from "@/lib/mock-data";

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#71717a"];

export function ModelBreakdown() {
  const data = tokensMock.byModel.map((m) => ({
    name: m.model,
    value: m.cost,
    pct: m.pct,
  }));

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-4">Model Breakdown</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: 4, fontSize: 12 }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {tokensMock.byModel.map((m, i) => (
            <div key={m.model} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-[#e4e4e7] flex-1 truncate">{m.model}</span>
              <span className="text-xs font-mono text-[#71717a]">{m.pct}%</span>
              <span className="text-xs font-mono text-[#71717a] w-14 text-right">${m.cost.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
