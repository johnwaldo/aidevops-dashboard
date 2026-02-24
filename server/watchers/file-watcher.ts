import { watch } from "node:fs";
import { join } from "node:path";
import { config } from "../config";
import { cacheInvalidate } from "../cache/store";
import { broadcast } from "../ws/realtime";
import { parseTodoFile } from "../parsers/todo-parser";

const watchers: ReturnType<typeof watch>[] = [];

export function startFileWatchers(): void {
  // Watch TODO.md in the aidevops repo
  const todoPath = join(config.aidevopsRepo, "TODO.md");
  try {
    const watcher = watch(todoPath, { persistent: false }, async (_event) => {
      console.log("[watcher] TODO.md changed, invalidating cache");
      cacheInvalidate("tasks");

      // Re-parse and broadcast
      try {
        const tasks = await parseTodoFile(todoPath);
        broadcast("tasks", tasks);
      } catch (err) {
        console.error("[watcher] Failed to re-parse TODO.md:", err);
      }
    });
    watchers.push(watcher);
    console.log(`[watcher] Watching ${todoPath}`);
  } catch (err) {
    console.warn(`[watcher] Cannot watch ${todoPath}:`, err);
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
