import { config } from "../config";
import { parseTodoFile, type ParsedTodo, type Task } from "../parsers/todo-parser";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";
import { getEnabledRepos } from "../writers/config-writer";
import { join } from "node:path";

/** Extend Task with the repo it came from */
export interface RepoTask extends Task {
  repo: string;
}

/** Same shape as ParsedTodo but with RepoTask */
export interface MultiRepoParsedTodo {
  ready: RepoTask[];
  backlog: RepoTask[];
  inProgress: RepoTask[];
  inReview: RepoTask[];
  done: RepoTask[];
  declined: RepoTask[];
}

const SECTIONS: (keyof ParsedTodo)[] = ["ready", "backlog", "inProgress", "inReview", "done", "declined"];

/** Tag every task in a ParsedTodo with its repo name and prefix the ID to avoid collisions */
function tagTasks(parsed: ParsedTodo, repoName: string): MultiRepoParsedTodo {
  const result = {} as MultiRepoParsedTodo;
  for (const section of SECTIONS) {
    result[section] = parsed[section].map((task) => ({
      ...task,
      repo: repoName,
      id: `${repoName}:${task.id}`,
    }));
  }
  return result;
}

/** Merge multiple MultiRepoParsedTodo into one */
function mergeParsed(items: MultiRepoParsedTodo[]): MultiRepoParsedTodo {
  const result: MultiRepoParsedTodo = {
    ready: [],
    backlog: [],
    inProgress: [],
    inReview: [],
    done: [],
    declined: [],
  };
  for (const item of items) {
    for (const section of SECTIONS) {
      result[section].push(...item[section]);
    }
  }
  return result;
}

/** Parse a single repo's TODO.md with caching */
async function getRepoTasks(repoName: string, todoPath: string): Promise<MultiRepoParsedTodo> {
  const cacheKey = `tasks:${repoName}`;
  const cached = cacheGet<MultiRepoParsedTodo>(cacheKey);
  if (cached) return cached.data;

  const parsed = await parseTodoFile(todoPath);
  const tagged = tagTasks(parsed, repoName);
  cacheSet(cacheKey, tagged, CACHE_TTL.tasks);
  return tagged;
}

export async function handleTasks(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const repoFilter = url.searchParams.get("repo");
  const projectFilter = url.searchParams.get("project");
  const statusFilter = url.searchParams.get("status");

  try {
    let result: MultiRepoParsedTodo;

    if (repoFilter) {
      // Single repo mode
      const repos = getEnabledRepos();
      const repo = repos.find((r) => r.name === repoFilter);
      if (!repo) {
        // Fall back to the default aidevops repo if the name matches
        if (repoFilter === "aidevops") {
          const todoPath = join(config.aidevopsRepo, "TODO.md");
          const parsed = await parseTodoFile(todoPath);
          result = tagTasks(parsed, "aidevops");
        } else {
          return apiError("NOT_FOUND", `Repo "${repoFilter}" not found or not enabled`, "tasks", 404);
        }
      } else {
        result = await getRepoTasks(repo.name, join(repo.path, "TODO.md"));
      }
    } else {
      // Merged view: all enabled repos
      const repos = getEnabledRepos();
      const allParsed: MultiRepoParsedTodo[] = [];

      if (repos.length === 0) {
        // No tracked repos configured — fall back to the default aidevops repo
        const todoPath = join(config.aidevopsRepo, "TODO.md");
        const parsed = await parseTodoFile(todoPath);
        allParsed.push(tagTasks(parsed, "aidevops"));
      } else {
        for (const repo of repos) {
          try {
            const tagged = await getRepoTasks(repo.name, join(repo.path, "TODO.md"));
            allParsed.push(tagged);
          } catch (err) {
            console.warn(`[tasks] Failed to parse ${repo.name}/TODO.md:`, err);
          }
        }
      }

      result = mergeParsed(allParsed);
    }

    // Apply filters if requested
    if (projectFilter || statusFilter) {
      const filtered = { ...result };
      for (const key of SECTIONS) {
        filtered[key] = filtered[key].filter((task) => {
          if (projectFilter && !task.tags.includes(projectFilter)) return false;
          if (statusFilter && task.status !== statusFilter) return false;
          return true;
        });
      }
      return apiResponse(filtered, "filesystem", CACHE_TTL.tasks);
    }

    return apiResponse(result, "filesystem", CACHE_TTL.tasks);
  } catch (err) {
    return apiError("PARSE_ERROR", String(err), "tasks");
  }
}
