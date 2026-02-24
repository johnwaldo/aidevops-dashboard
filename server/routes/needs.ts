import { cacheGet, cacheSet } from "../cache/store";
import { config } from "../config";
import { apiResponse, apiError } from "./_helpers";

export interface NeedItem {
  id: string;
  type: "approval" | "review" | "failure" | "security" | "overdue" | "config" | "budget" | "ssl" | "expiring";
  title: string;
  description: string;
  source: string;
  priority: "critical" | "high" | "medium" | "low";
  url: string | null;
  createdAt: string;
}

const PRIORITY_ORDER: Record<NeedItem["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function handleNeeds(_req: Request): Promise<Response> {
  try {
    const needs: NeedItem[] = [];
    let needId = 0;
    const t = config.thresholds;

    // --- Tasks: items in review ---
    const tasksCache = cacheGet<{
      ready: { title: string; id: string; priority: string }[];
      inProgress: { title: string; id: string; priority: string; started?: string }[];
      inReview: { title: string; id: string; priority: string }[];
      backlog: { title: string; id: string; priority: string }[];
    }>("tasks");
    if (tasksCache) {
      const tasks = tasksCache.data;
      if (tasks.inReview) {
        for (const task of tasks.inReview) {
          needs.push({
            id: `need-${++needId}`,
            type: "approval",
            title: `Review: ${task.title}`,
            description: `Task ${task.id} is awaiting review`,
            source: "TODO.md",
            priority: task.priority === "P0" ? "critical" : task.priority === "P1" ? "high" : "medium",
            url: null,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // --- Tasks: overdue (in progress > N days) ---
      if (tasks.inProgress) {
        const now = Date.now();
        for (const task of tasks.inProgress) {
          if (task.started) {
            const startedAt = new Date(task.started).getTime();
            const daysElapsed = (now - startedAt) / (1000 * 60 * 60 * 24);
            if (daysElapsed > t.tasks.overdueAfterDays) {
              needs.push({
                id: `need-${++needId}`,
                type: "overdue",
                title: `Overdue: ${task.title}`,
                description: `Task ${task.id} has been in progress for ${Math.floor(daysElapsed)} days`,
                source: "TODO.md",
                priority: daysElapsed > t.tasks.overdueAfterDays * 2 ? "high" : "medium",
                url: null,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // --- Projects: failing CI, open PRs ---
    const projectsCache = cacheGet<{
      name: string;
      ci: string;
      prs: number;
      url: string;
    }[]>("projects");
    if (projectsCache) {
      for (const project of projectsCache.data) {
        if (project.ci === "failing") {
          needs.push({
            id: `need-${++needId}`,
            type: "failure",
            title: `CI failing: ${project.name}`,
            description: `GitHub Actions pipeline is failing for ${project.name}`,
            source: "GitHub Actions",
            priority: "high",
            url: project.url ? `${project.url}/actions` : null,
            createdAt: new Date().toISOString(),
          });
        }
        if (project.prs > 0) {
          needs.push({
            id: `need-${++needId}`,
            type: "review",
            title: `${project.prs} open PR${project.prs > 1 ? "s" : ""}: ${project.name}`,
            description: `${project.name} has ${project.prs} open pull request${project.prs > 1 ? "s" : ""} awaiting review`,
            source: "GitHub",
            priority: "medium",
            url: project.url ? `${project.url}/pulls` : null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // --- Token budget alerts ---
    const tokensCache = cacheGet<{
      budget: { today: number; currentMonth: number };
    }>("tokens");
    if (tokensCache) {
      const { budget } = tokensCache.data;
      const monthPct = (budget.currentMonth / t.tokenBudget.monthlyCap) * 100;

      if (monthPct >= 100) {
        needs.push({
          id: `need-${++needId}`,
          type: "budget",
          title: "Token budget exceeded",
          description: `$${budget.currentMonth.toFixed(0)} of $${t.tokenBudget.monthlyCap} monthly cap (${Math.round(monthPct)}%)`,
          source: "Token Tracker",
          priority: "critical",
          url: null,
          createdAt: new Date().toISOString(),
        });
      } else if (monthPct >= t.tokenBudget.monthlyAlertPct) {
        needs.push({
          id: `need-${++needId}`,
          type: "budget",
          title: `Token budget at ${Math.round(monthPct)}%`,
          description: `$${budget.currentMonth.toFixed(0)} of $${t.tokenBudget.monthlyCap} monthly cap`,
          source: "Token Tracker",
          priority: "high",
          url: null,
          createdAt: new Date().toISOString(),
        });
      }

      if (budget.today > t.tokenBudget.dailyWarn) {
        needs.push({
          id: `need-${++needId}`,
          type: "budget",
          title: `High daily spend: $${budget.today.toFixed(2)}`,
          description: `Daily spend exceeds $${t.tokenBudget.dailyWarn} warning threshold`,
          source: "Token Tracker",
          priority: "medium",
          url: null,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // --- SSL certificate expiry ---
    const sslCache = cacheGet<{
      domain: string;
      daysRemaining: number | null;
      status: string;
    }[]>("ssl");
    if (sslCache) {
      for (const cert of sslCache.data) {
        if (cert.status === "expired") {
          needs.push({
            id: `need-${++needId}`,
            type: "ssl",
            title: `SSL expired: ${cert.domain}`,
            description: "Certificate has expired — site is insecure",
            source: "SSL Monitor",
            priority: "critical",
            url: null,
            createdAt: new Date().toISOString(),
          });
        } else if (cert.status === "critical" || cert.status === "expiring") {
          needs.push({
            id: `need-${++needId}`,
            type: "expiring",
            title: `SSL cert: ${cert.domain} — ${cert.daysRemaining}d`,
            description: `Certificate expires in ${cert.daysRemaining} days`,
            source: "SSL Monitor",
            priority: cert.status === "critical" ? "high" : "medium",
            url: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // --- Health: critical system status ---
    const healthCache = cacheGet<{
      status: string;
      cpu: { combined: number };
      memory: { pct: number };
      disk: { pct: number };
    }>("healthLocal");
    if (healthCache) {
      const health = healthCache.data;
      if (health.status === "critical") {
        needs.push({
          id: `need-${++needId}`,
          type: "config",
          title: "Local system critical",
          description: `CPU: ${health.cpu.combined}%, RAM: ${health.memory.pct}%, Disk: ${health.disk.pct}%`,
          source: "System Monitor",
          priority: "critical",
          url: null,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // --- VPS health ---
    const vpsCache = cacheGet<{ status: string; hostname: string }>("healthVPS");
    if (vpsCache && vpsCache.data) {
      const vps = vpsCache.data;
      if (vps.status === "critical" || vps.status === "unreachable") {
        needs.push({
          id: `need-${++needId}`,
          type: vps.status === "unreachable" ? "failure" : "config",
          title: `VPS ${vps.status}: ${vps.hostname}`,
          description: `VPS server is ${vps.status}`,
          source: "VPS Monitor",
          priority: "critical",
          url: null,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // --- Ollama stopped ---
    const ollamaCache = cacheGet<{ status: string }>("ollama");
    if (ollamaCache && ollamaCache.data.status !== "running") {
      needs.push({
        id: `need-${++needId}`,
        type: "config",
        title: `Ollama ${ollamaCache.data.status}`,
        description: "Local Ollama instance is not running. Start it with `ollama serve`.",
        source: "Ollama",
        priority: "low",
        url: null,
        createdAt: new Date().toISOString(),
      });
    }

    // Sort by priority
    needs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    cacheSet("needs", needs, 10);
    return apiResponse(needs, "aggregator", 10);
  } catch (err) {
    return apiError("AGGREGATION_ERROR", String(err), "needs");
  }
}
