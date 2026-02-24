import { cacheGet, cacheSet } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export interface NeedItem {
  id: string;
  type: "approval" | "review" | "failure" | "security" | "overdue" | "config";
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

    // Pull from cached tasks — items in "In Review" or pending approval
    const tasksCache = cacheGet<{
      ready: { title: string; id: string; priority: string }[];
      inProgress: { title: string; id: string; priority: string }[];
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
    }

    // Pull from cached projects — failing CI, open PRs needing review
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

    // Pull from cached health — critical system status
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

    // Pull from cached VPS health
    const vpsCache = cacheGet<{
      status: string;
      hostname: string;
    }>("healthVPS");
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

    // Pull from cached Ollama — stopped or error
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

    // Cache the aggregated needs briefly (recomputed on demand)
    cacheSet("needs", needs, 10);

    return apiResponse(needs, "aggregator", 10);
  } catch (err) {
    return apiError("AGGREGATION_ERROR", String(err), "needs");
  }
}
