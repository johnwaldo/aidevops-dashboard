import { getSecret } from "../secrets";

export interface WorkflowRun {
  id: number;
  name: string;
  repo: string;
  branch: string;
  status: "completed" | "in_progress" | "queued" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | null;
  startedAt: string;
  completedAt: string | null;
  durationSec: number | null;
  url: string;
  actor: string;
}

export interface CIStatus {
  repos: RepoCI[];
  running: WorkflowRun[];
  recentFailures: WorkflowRun[];
  summary: {
    totalRuns: number;
    successRate: number;
    avgDurationSec: number;
    failureCount: number;
  };
}

export interface RepoCI {
  repo: string;
  runs: WorkflowRun[];
  successRate: number;
  avgDurationSec: number;
  lastRun: WorkflowRun | null;
}

interface GHWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  run_started_at: string;
  updated_at: string;
  html_url: string;
  actor: { login: string };
}

interface GHRunsResponse {
  workflow_runs: GHWorkflowRun[];
}

async function ghApi<T>(path: string): Promise<T | null> {
  const token = await getSecret("GITHUB_TOKEN");
  if (!token) return null;

  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 403) console.warn("[actions] Rate limited");
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`[actions] API error for ${path}:`, err);
    return null;
  }
}

function parseRun(run: GHWorkflowRun, repoName: string): WorkflowRun {
  const startedAt = run.run_started_at;
  const completedAt = run.status === "completed" ? run.updated_at : null;
  const durationSec =
    completedAt && startedAt
      ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : null;

  return {
    id: run.id,
    name: run.name,
    repo: repoName,
    branch: run.head_branch,
    status: run.status as WorkflowRun["status"],
    conclusion: run.conclusion as WorkflowRun["conclusion"],
    startedAt,
    completedAt,
    durationSec,
    url: run.html_url,
    actor: run.actor.login,
  };
}

export async function collectCIStatus(): Promise<CIStatus> {
  if (!(await getSecret("GITHUB_TOKEN"))) {
    return { repos: [], running: [], recentFailures: [], summary: { totalRuns: 0, successRate: 0, avgDurationSec: 0, failureCount: 0 } };
  }

  // Get user's repos (most recently updated, with Actions likely)
  interface GHRepo {
    full_name: string;
    name: string;
  }
  const repos = await ghApi<GHRepo[]>("/user/repos?sort=updated&per_page=10&type=owner");
  if (!repos) {
    return { repos: [], running: [], recentFailures: [], summary: { totalRuns: 0, successRate: 0, avgDurationSec: 0, failureCount: 0 } };
  }

  const repoResults: RepoCI[] = [];
  const allRunning: WorkflowRun[] = [];
  const allFailures: WorkflowRun[] = [];
  let totalRuns = 0;
  let totalSuccess = 0;
  let totalDuration = 0;
  let durationCount = 0;

  // Fetch runs in batches of 5
  const batchSize = 5;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (repo) => {
        const data = await ghApi<GHRunsResponse>(`/repos/${repo.full_name}/actions/runs?per_page=10`);
        if (!data?.workflow_runs?.length) return null;

        const runs = data.workflow_runs.map((r) => parseRun(r, repo.name));
        const completed = runs.filter((r) => r.status === "completed");
        const successes = completed.filter((r) => r.conclusion === "success");
        const failures = completed.filter((r) => r.conclusion === "failure");
        const running = runs.filter((r) => r.status === "in_progress" || r.status === "queued");
        const durations = completed.filter((r) => r.durationSec !== null).map((r) => r.durationSec!);
        const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        return {
          repo: repo.name,
          runs,
          successRate: completed.length > 0 ? Math.round((successes.length / completed.length) * 100) : 0,
          avgDurationSec: avgDuration,
          lastRun: runs[0] ?? null,
          running,
          failures,
          completed,
          successes,
          durations,
        };
      })
    );

    for (const result of results) {
      if (!result) continue;

      repoResults.push({
        repo: result.repo,
        runs: result.runs,
        successRate: result.successRate,
        avgDurationSec: result.avgDurationSec,
        lastRun: result.lastRun,
      });

      allRunning.push(...result.running);
      allFailures.push(...result.failures);
      totalRuns += result.completed.length;
      totalSuccess += result.successes.length;
      totalDuration += result.durations.reduce((a, b) => a + b, 0);
      durationCount += result.durations.length;
    }
  }

  return {
    repos: repoResults,
    running: allRunning,
    recentFailures: allFailures.slice(0, 10),
    summary: {
      totalRuns,
      successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
      avgDurationSec: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      failureCount: allFailures.length,
    },
  };
}
