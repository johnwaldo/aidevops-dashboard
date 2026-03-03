import { watch } from "node:fs";
import { join } from "node:path";
import { config } from "../config";
import { cacheInvalidate, cacheInvalidatePrefix } from "../cache/store";
import { broadcast } from "../ws/realtime";
import { parseTodoFile } from "../parsers/todo-parser";
import { getEnabledRepos } from "../writers/config-writer";

const watchers: ReturnType<typeof watch>[] = [];

function watchTodoFile(todoPath: string, repoName: string): void {
  try {
    const watcher = watch(todoPath, { persistent: false }, async (_event) => {
      console.log(`[watcher] ${repoName}/TODO.md changed, invalidating cache`);
      cacheInvalidate(`tasks:${repoName}`);
      cacheInvalidatePrefix("tasks:merged");

      // Re-parse and broadcast
      try {
        const tasks = await parseTodoFile(todoPath);
        broadcast("tasks", { ...tasks, repo: repoName });
      } catch (err) {
        console.error(`[watcher] Failed to re-parse ${repoName}/TODO.md:`, err);
      }
    });
    watchers.push(watcher);
    console.log(`[watcher] Watching ${todoPath}`);
  } catch (err) {
    console.warn(`[watcher] Cannot watch ${todoPath}:`, err);
  }
}

export function startFileWatchers(): void {
  // Watch TODO.md in all enabled tracked repos
  const repos = getEnabledRepos();

  if (repos.length > 0) {
    for (const repo of repos) {
      const todoPath = join(repo.path, "TODO.md");
      watchTodoFile(todoPath, repo.name);
    }
  } else {
    // Fallback: watch the default aidevops repo
    const todoPath = join(config.aidevopsRepo, "TODO.md");
    watchTodoFile(todoPath, "aidevops");
  }

  // Watch workspace directory for changes
  try {
    const watcher = watch(config.workspaceDir, { recursive: true, persistent: false }, (_event, filename) => {
      if (filename) {
        console.log(`[watcher] Workspace changed: ${filename}`);
        cacheInvalidate("documents");
        broadcast("documents", { changed: filename });
      }
    });
    watchers.push(watcher);
    console.log(`[watcher] Watching ${config.workspaceDir}`);
  } catch (err) {
    console.warn(`[watcher] Cannot watch workspace:`, err);
  }
}

export function stopFileWatchers(): void {
  for (const watcher of watchers) {
    watcher.close();
  }
  watchers.length = 0;
}

/** Restart file watchers (call after tracked repos change) */
export function restartFileWatchers(): void {
  stopFileWatchers();
  startFileWatchers();
}
