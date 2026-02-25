import { useState, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { LoadingPanel } from "@/components/shared/LoadingPanel";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Bell, Radio, Pencil } from "lucide-react";

interface DashboardSettings {
  tokenBudget: {
    monthlyCap: number;
    dailyWarn: number;
    monthlyWarnPct: number;
    monthlyAlertPct: number;
  };
  collectors: Record<string, boolean>;
  refreshIntervals: Record<string, number>;
  alerts: Record<string, { enabled: boolean; threshold?: number }>;
}

const collectorLabels: Record<string, string> = {
  systemLocal: "Local System",
  systemVps: "VPS",
  ollama: "Ollama",
  git: "Git/GitHub",
  tokens: "Token Usage",
  uptime: "Uptime",
  ssl: "SSL Certs",
  actions: "CI/CD",
  pagespeed: "PageSpeed",
};

const alertLabels: Record<string, string> = {
  "budget-75-percent": "Budget 75% warning",
  "budget-90-percent": "Budget 90% alert",
  "cpu-high": "CPU high usage",
  "ram-high": "RAM high usage",
  "disk-high": "Disk high usage",
  "ssl-expiry-14d": "SSL expiry 14 days",
  "ssl-expiry-7d": "SSL expiry 7 days",
};

export function DashboardConfig() {
  const { data: settings, loading, error, refresh } = useApiData<DashboardSettings>("actions/settings", 300);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const { showToast } = useToast();

  const budgetAction = useAction({
    endpoint: "/api/actions/settings/budget",
    method: "PUT",
    onSuccess: () => {
      showToast("success", "Budget cap updated");
      setEditingBudget(false);
      refresh();
    },
    onError: (err) => showToast("error", `Failed: ${err}`),
  });

  const collectorAction = useAction({
    endpoint: "/api/actions/settings/collectors",
    method: "PUT",
    onSuccess: () => {
      showToast("success", "Collector updated");
      refresh();
    },
    onError: (err) => showToast("error", `Failed: ${err}`),
  });

  const alertAction = useAction({
    endpoint: "/api/actions/settings/alerts",
    method: "PUT",
    onSuccess: () => {
      showToast("success", "Alert rule updated");
      refresh();
    },
    onError: (err) => showToast("error", `Failed: ${err}`),
  });

  useEffect(() => {
    if (settings) {
      setBudgetValue(String(settings.tokenBudget.monthlyCap));
    }
  }, [settings]);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {settings && (
        <div className="space-y-4">
          {/* Budget */}
          <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Token Budget</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Monthly cap</span>
              {editingBudget ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#71717a]">$</span>
                  <Input
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    className="w-24 h-7 text-xs bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] font-mono"
                    type="number"
                    min="1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingBudget(false);
                    }}
                  />
                  <ConfirmDialog
                    title="Update budget cap"
                    description={`Change monthly token budget cap from $${settings.tokenBudget.monthlyCap} to $${budgetValue}.`}
                    onConfirm={async () => {
                      await budgetAction.execute({ monthlyCap: Number(budgetValue) });
                    }}
                  >
                    <Button size="sm" className="h-7 text-[10px] bg-cyan-600 hover:bg-cyan-700 text-white">
                      Save
                    </Button>
                  </ConfirmDialog>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a]"
                    onClick={() => {
                      setEditingBudget(false);
                      setBudgetValue(String(settings.tokenBudget.monthlyCap));
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-xs font-mono text-[#e4e4e7] hover:text-cyan-400 transition-colors"
                  onClick={() => setEditingBudget(true)}
                >
                  ${settings.tokenBudget.monthlyCap}
                  <Pencil className="h-3 w-3 text-[#3f3f46]" />
                </button>
              )}
            </div>
          </div>

          {/* Alert Rules */}
          <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Alert Rules</h3>
            </div>
            <div className="space-y-2.5">
              {Object.entries(settings.alerts).map(([ruleId, rule]) => (
                <div key={ruleId} className="flex items-center justify-between">
                  <span className="text-xs text-[#71717a]">{alertLabels[ruleId] ?? ruleId}</span>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => {
                      alertAction.execute({ ruleId, enabled: checked, threshold: rule.threshold });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Collectors */}
          <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Data Collectors</h3>
            </div>
            <div className="space-y-2.5">
              {Object.entries(settings.collectors).map(([name, enabled]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-xs text-[#71717a]">{collectorLabels[name] ?? name}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => {
                      collectorAction.execute({ collector: name, enabled: checked });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
