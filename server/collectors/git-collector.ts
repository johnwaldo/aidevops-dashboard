import { config } from "../config";

export interface GitProject {
  name: string;
  description: string;
  url: string;
  platform: "github";
  branch: string;
  lastCommit: { sha: string; message: string; author: string; time: string } | null;
  ci: "passing" | "failing" | "none" | "pending";
  issues: number;
  prs: number;
  language: string | null;
  visibility: string;
  updatedAt: string;
}

async function ghApi<T>(path: string): Promise<T | null> {
  if (!config.githubToken) return null;

  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 403) console.warn("[git] Rate limited");
      return null;
    }

    return await res.json() as T;
  } catch (err) {
    console.error(`[git] API error for ${path}:`, err);
    return null;
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface GHRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  visibility: string;
  updated_at: string;
  open_issues_count: number;
}

interface GHCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}

interface GHWorkflowRun {
  conclusion: string | null;
  status: string;
}

interface GHPull {
  number: number;
}

export async function collectGitProjects(): Promise<GitProject[]> {
  if (!config.githubToken) {
    console.warn("[git] No GitHub token configured, skipping");
    return [];
  }

  // Get user's repos (most recently updated)
  const repos = await ghApi<GHRepo[]>("/user/repos?sort=updated&per_page=20&type=owner");
  if (!repos) return [];

  const projects: GitProject[] = [];

  // Process repos in parallel (batches of 5 to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (repo): Promise<GitProject> => {
        // Fetch latest commit, PRs, and CI status in parallel
        const [commits, pulls, runs] = await Promise.all([
          ghApi<GHCommit[]>(`/repos/${repo.full_name}/commits?per_page=1`),
          ghApi<GHPull[]>(`/repos/${repo.full_name}/pulls?state=open&per_page=100`),
          ghApi<{ workflow_runs: GHWorkflowRun[] }>(`/repos/${repo.full_name}/actions/runs?per_page=1`),
        ]);

        const lastCommit = commits?.[0]
          ? {
              sha: commits[0].sha.slice(0, 7),
              message: commits[0].commit.message.split("\n")[0],
              author: commits[0].commit.author.name,
              time: timeAgo(commits[0].commit.author.date),
            }
          : null;

        let ci: GitProject["ci"] = "none";
        if (runs?.workflow_runs?.[0]) {
          const run = runs.workflow_runs[0];
          if (run.conclusion === "success") ci = "passing";
          else if (run.conclusion === "failure") ci = "failing";
          else if (run.status === "in_progress" || run.status === "queued") ci = "pending";
        }

        return {
          name: repo.name,
          description: repo.description ?? "",
          url: repo.html_url,
          platform: "github",
          branch: repo.default_branch,
          lastCommit,
          ci,
          issues: repo.open_issues_count - (pulls?.length ?? 0), // GitHub counts PRs as issues
          prs: pulls?.length ?? 0,
          language: repo.language,
          visibility: repo.visibility,
          updatedAt: repo.updated_at,
        };
      })
    );

    projects.push(...results);
  }

  return projects;
}
