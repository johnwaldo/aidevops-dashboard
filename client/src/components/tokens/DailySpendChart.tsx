import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface TokensData {
  budget: {
    today: number;
    thisWeek: number;
    currentMonth: number;
    dailyHistory: number[];
  };
}

export function DailySpendChart() {
  const { data: tokens, loading, error, refresh } = useApiData<TokensData>("tokens", 60);

  if (!tokens) {
    return <LoadingPanel loading={loading} error={error} onRetry={refresh}><div /></LoadingPanel>;
  }

  const { budget } = tokens;
  const historyLen = budget.dailyHistory.length || 1;
  const dailyAvg = budget.currentMonth / historyLen;

  const data = budget.dailyHistory.map((val, i) => ({
    day: `Day ${i + 1}`,
    spend: val,
  }));

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-4">Daily Spend ({historyLen} days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: 4, fontSize: 12 }}
              labelStyle={{ color: "#71717a" }}
              itemStyle={{ color: "#06b6d4" }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
            />
            <ReferenceLine y={dailyAvg} stroke="#71717a" strokeDasharray="3 3" label={{ value: "Avg", position: "right", fill: "#71717a", fontSize: 10 }} />
            <Bar dataKey="spend" fill="#06b6d4" radius={[2, 2, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </LoadingPanel>
  );
}
