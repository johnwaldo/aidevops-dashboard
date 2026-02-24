import { cacheGet } from "../cache/store";
import { config } from "../config";
import { apiResponse, apiError } from "./_helpers";

export interface Alert {
  id: string;
  category: "budget" | "health" | "ssl" | "ci" | "tasks";
  level: "info" | "warn" | "alert" | "critical";
  title: string;
  detail: string;
  value: number | string | null;
  threshold: number | string | null;
}

export async function handleAlerts(_req: Request): Promise<Response> {
  try {
    const alerts: Alert[] = [];
    let alertId = 0;
    const t = config.thresholds;

    // --- Token budget alerts ---
    const tokensCache = cacheGet<{
      budget: { today: number; currentMonth: number };
      totalCost: number;
    }>("tokens");
    if (tokensCache) {
      const { budget } = tokensCache.data;
      const monthPct = (budget.currentMonth / t.tokenBudget.monthlyCap) * 100;

      if (monthPct >= 100) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "budget",
          level: "critical",
          title: "Monthly token budget exceeded",
          detail: `$${budget.currentMonth.toFixed(0)} of $${t.tokenBudget.monthlyCap} cap (${Math.round(monthPct)}%)`,
          value: budget.currentMonth,
          threshold: t.tokenBudget.monthlyCap,
        });
      } else if (monthPct >= t.tokenBudget.monthlyAlertPct) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "budget",
          level: "alert",
          title: "Monthly token budget at " + Math.round(monthPct) + "%",
          detail: `$${budget.currentMonth.toFixed(0)} of $${t.tokenBudget.monthlyCap} cap`,
          value: budget.currentMonth,
          threshold: t.tokenBudget.monthlyCap,
        });
      } else if (monthPct >= t.tokenBudget.monthlyWarnPct) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "budget",
          level: "warn",
          title: "Monthly token budget at " + Math.round(monthPct) + "%",
          detail: `$${budget.currentMonth.toFixed(0)} of $${t.tokenBudget.monthlyCap} cap`,
          value: budget.currentMonth,
          threshold: t.tokenBudget.monthlyCap,
        });
      }

      if (budget.today > t.tokenBudget.dailyWarn) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "budget",
          level: "warn",
          title: "Daily spend exceeds warning threshold",
          detail: `$${budget.today.toFixed(2)} today (warn at $${t.tokenBudget.dailyWarn})`,
          value: budget.today,
          threshold: t.tokenBudget.dailyWarn,
        });
      }
    }

    // --- Health alerts ---
    const healthCache = cacheGet<{
      cpu: { combined: number };
      memory: { pct: number };
      disk: { pct: number };
    }>("healthLocal");
    if (healthCache) {
      const h = healthCache.data;
      if (h.cpu.combined > t.health.cpuWarn) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "health",
          level: h.cpu.combined > 95 ? "critical" : "warn",
          title: "High CPU usage",
          detail: `${h.cpu.combined}% (warn at ${t.health.cpuWarn}%)`,
          value: h.cpu.combined,
          threshold: t.health.cpuWarn,
        });
      }
      if (h.memory.pct > t.health.ramWarn) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "health",
          level: h.memory.pct > 95 ? "critical" : "warn",
          title: "High memory usage",
          detail: `${h.memory.pct}% (warn at ${t.health.ramWarn}%)`,
          value: h.memory.pct,
          threshold: t.health.ramWarn,
        });
      }
      if (h.disk.pct > t.health.diskWarn) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "health",
          level: h.disk.pct > 95 ? "critical" : "alert",
          title: "High disk usage",
          detail: `${h.disk.pct}% (warn at ${t.health.diskWarn}%)`,
          value: h.disk.pct,
          threshold: t.health.diskWarn,
        });
      }
    }

    // --- SSL alerts ---
    const sslCache = cacheGet<{
      domain: string;
      daysRemaining: number | null;
      status: string;
    }[]>("ssl");
    if (sslCache) {
      for (const cert of sslCache.data) {
        if (cert.status === "expired") {
          alerts.push({
            id: `alert-${++alertId}`,
            category: "ssl",
            level: "critical",
            title: `SSL expired: ${cert.domain}`,
            detail: "Certificate has expired",
            value: cert.daysRemaining,
            threshold: 0,
          });
        } else if (cert.status === "critical") {
          alerts.push({
            id: `alert-${++alertId}`,
            category: "ssl",
            level: "alert",
            title: `SSL expiring soon: ${cert.domain}`,
            detail: `${cert.daysRemaining} days remaining`,
            value: cert.daysRemaining,
            threshold: t.ssl.expiryAlertDays,
          });
        } else if (cert.status === "expiring") {
          alerts.push({
            id: `alert-${++alertId}`,
            category: "ssl",
            level: "warn",
            title: `SSL expiring: ${cert.domain}`,
            detail: `${cert.daysRemaining} days remaining`,
            value: cert.daysRemaining,
            threshold: t.ssl.expiryWarnDays,
          });
        }
      }
    }

    // --- CI failure alerts ---
    const projectsCache = cacheGet<{ name: string; ci: string; url: string }[]>("projects");
    if (projectsCache) {
      const failing = projectsCache.data.filter((p) => p.ci === "failing");
      for (const p of failing) {
        alerts.push({
          id: `alert-${++alertId}`,
          category: "ci",
          level: "alert",
          title: `CI failing: ${p.name}`,
          detail: "Latest workflow run failed",
          value: p.ci,
          threshold: "passing",
        });
      }
    }

    // Sort: critical > alert > warn > info
    const levelOrder: Record<string, number> = { critical: 0, alert: 1, warn: 2, info: 3 };
    alerts.sort((a, b) => (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9));

    return apiResponse(alerts, "aggregator", 10);
  } catch (err) {
    return apiError("ALERT_ERROR", String(err), "alerts");
  }
}
