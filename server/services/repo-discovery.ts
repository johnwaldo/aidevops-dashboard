import { readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { config } from "../config";

export interface TrackedRepo {
  /** Short name derived from directory name */
  name: string;
  /** Absolute path to the repo root */
  path: string;
  /** Whether this repo's tasks should be shown */
  enabled: boolean;
}

/**
 * Scan config.gitDir for directories containing TODO.md.
 * Filters out git worktrees (they have a `.git` file, not a `.git/` directory).
 * Returns discovered repos as TrackedRepo candidates.
 */
export function discoverRepos(): TrackedRepo[] {
  const gitDir = config.gitDir;
  if (!existsSync(gitDir)) return [];

  const repos: TrackedRepo[] = [];

  try {
    const entries = readdirSync(gitDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const repoPath = join(gitDir, entry.name);
      const todoPath = join(repoPath, "TODO.md");
      const gitPath = join(repoPath, ".git");

      // Must have TODO.md
      if (!existsSync(todoPath)) continue;

      // Must have .git (either file or directory)
      if (!existsSync(gitPath)) continue;

      // Skip worktrees: a worktree has a `.git` *file* (not directory) containing "gitdir: ..."
      try {
        const gitStat = statSync(gitPath);
        if (gitStat.isFile()) {
          const content = readFileSync(gitPath, "utf-8").trim();
          if (content.startsWith("gitdir:")) continue;
        }
      } catch {
        // If we can't stat, skip this entry
        continue;
      }

      repos.push({
        name: basename(repoPath),
        path: repoPath,
        enabled: true,
      });
    }
  } catch (err) {
    console.error("[repo-discovery] Failed to scan git directory:", err);
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the TODO.md path for a tracked repo.
 */
export function getTodoPath(repo: TrackedRepo): string {
  return join(repo.path, "TODO.md");
}

/**
 * Resolve a repo by name from a list of tracked repos.
 * Returns undefined if not found or not enabled.
 */
export function resolveRepo(repos: TrackedRepo[], name: string): TrackedRepo | undefined {
  return repos.find((r) => r.name === name && r.enabled);
}
