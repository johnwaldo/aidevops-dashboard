import { config } from "../config";
import { parseTodoFile } from "../parsers/todo-parser";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";
import { join } from "node:path";

export async function handleTasks(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const projectFilter = url.searchParams.get("project");
  const statusFilter = url.searchParams.get("status");

  const cacheKey = "tasks";
  const cached = cacheGet(cacheKey);
  if (cached && !projectFilter && !statusFilter) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const todoPath = join(config.aidevopsRepo, "TODO.md");
    const parsed = await parseTodoFile(todoPath);

    cacheSet(cacheKey, parsed, CACHE_TTL.tasks);

    // Apply filters if requested
    if (projectFilter || statusFilter) {
      const filtered = { ...parsed };
      for (const key of Object.keys(filtered) as (keyof typeof filtered)[]) {
        filtered[key] = filtered[key].filter((task) => {
          if (projectFilter && !task.tags.includes(projectFilter)) return false;
          if (statusFilter && task.status !== statusFilter) return false;
          return true;
        });
      }
      return apiResponse(filtered, "filesystem", CACHE_TTL.tasks);
    }

    return apiResponse(parsed, "filesystem", CACHE_TTL.tasks);
  } catch (err) {
    return apiError("PARSE_ERROR", String(err), "tasks");
  }
}
