import { config } from "../../config";
import { TodoWriter } from "../../writers/todo-writer";
import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { broadcast } from "../../ws/realtime";
import { cacheInvalidate, cacheInvalidatePrefix } from "../../cache/store";
import { apiResponse, apiError } from "../_helpers";
import { getEnabledRepos } from "../../writers/config-writer";
import { join } from "node:path";

/** Cache of TodoWriter instances per repo path to avoid re-creating */
const writers = new Map<string, TodoWriter>();

/**
 * Resolve the TODO.md path and TodoWriter for a given repo name.
 * If no repo is specified, falls back to the default aidevops repo.
 * Task IDs from the client are prefixed as "repoName:tNNN" — strip the prefix
 * to get the raw task ID for the writer.
 */
function resolveWriter(repoName?: string): { writer: TodoWriter; repoName: string } {
  let todoPath: string;
  let resolvedName: string;

  if (repoName) {
    const repos = getEnabledRepos();
    const repo = repos.find((r) => r.name === repoName);
    if (repo) {
      todoPath = join(repo.path, "TODO.md");
      resolvedName = repo.name;
    } else if (repoName === "aidevops") {
      todoPath = `${config.aidevopsRepo}/TODO.md`;
      resolvedName = "aidevops";
    } else {
      throw new Error(`Repo "${repoName}" not found or not enabled`);
    }
  } else {
    todoPath = `${config.aidevopsRepo}/TODO.md`;
    resolvedName = "aidevops";
  }

  let w = writers.get(todoPath);
  if (!w) {
    w = new TodoWriter(todoPath);
    writers.set(todoPath, w);
  }
  return { writer: w, repoName: resolvedName };
}

/**
 * Parse a composite task ID like "aidevops:t042" into { repo, taskId }.
 * If no colon prefix, assumes the default aidevops repo.
 */
function parseCompositeId(compositeId: string): { repo: string | undefined; taskId: string } {
  const colonIdx = compositeId.indexOf(":");
  if (colonIdx > 0) {
    return {
      repo: compositeId.slice(0, colonIdx),
      taskId: compositeId.slice(colonIdx + 1),
    };
  }
  return { repo: undefined, taskId: compositeId };
}

function invalidateTaskCaches(repoName: string): void {
  cacheInvalidate(`tasks:${repoName}`);
  cacheInvalidatePrefix("tasks:merged");
}

export async function handleTaskMove(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { taskId: string; from: string; to: string; repo?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/tasks", 400);
  }

  if (!body.taskId || !body.from || !body.to) {
    return apiError("BAD_REQUEST", "Missing required fields: taskId, from, to", "actions/tasks", 400);
  }

  // Parse composite ID (e.g., "aidevops:t042")
  const { repo: idRepo, taskId: rawTaskId } = parseCompositeId(body.taskId);
  const repoName = body.repo ?? idRepo;

  try {
    const { writer, repoName: resolved } = resolveWriter(repoName);
    await writer.moveTask(rawTaskId, body.from, body.to);

    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.move",
      target: body.taskId,
      params: sanitizeParams({ ...body, repo: resolved } as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    invalidateTaskCaches(resolved);
    broadcast("tasks", { action: "move", taskId: body.taskId, from: body.from, to: body.to, repo: resolved });

    return apiResponse({ success: true, taskId: body.taskId, from: body.from, to: body.to, repo: resolved }, "actions/tasks", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.move",
      target: body.taskId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/tasks", 500);
  }
}

export async function handleTaskCreate(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: {
    title: string;
    column: string;
    project?: string;
    priority?: string;
    agent?: string;
    estimate?: string;
    repo?: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/tasks", 400);
  }

  if (!body.title) {
    return apiError("BAD_REQUEST", "Missing required field: title", "actions/tasks", 400);
  }

  try {
    const { writer, repoName: resolved } = resolveWriter(body.repo);
    const taskId = await writer.createTask({
      title: body.title,
      column: body.column || "backlog",
      project: body.project,
      priority: body.priority,
      agent: body.agent,
      estimate: body.estimate,
    });

    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.create",
      target: taskId,
      params: sanitizeParams({ ...body, repo: resolved } as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    invalidateTaskCaches(resolved);
    broadcast("tasks", { action: "create", taskId: `${resolved}:${taskId}`, repo: resolved });

    return apiResponse({ success: true, taskId: `${resolved}:${taskId}`, repo: resolved }, "actions/tasks", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.create",
      target: body.title,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/tasks", 500);
  }
}

export async function handleTaskUpdate(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { taskId: string; field: string; value: string; repo?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/tasks", 400);
  }

  if (!body.taskId || !body.field || body.value === undefined) {
    return apiError("BAD_REQUEST", "Missing required fields: taskId, field, value", "actions/tasks", 400);
  }

  const allowedFields = ["title", "estimate", "priority", "agent"];
  if (!allowedFields.includes(body.field)) {
    return apiError("BAD_REQUEST", `Invalid field: ${body.field}. Allowed: ${allowedFields.join(", ")}`, "actions/tasks", 400);
  }

  // Parse composite ID
  const { repo: idRepo, taskId: rawTaskId } = parseCompositeId(body.taskId);
  const repoName = body.repo ?? idRepo;

  try {
    const { writer, repoName: resolved } = resolveWriter(repoName);
    await writer.updateTaskField(rawTaskId, body.field, body.value);

    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.update",
      target: body.taskId,
      params: sanitizeParams({ ...body, repo: resolved } as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    invalidateTaskCaches(resolved);
    broadcast("tasks", { action: "update", taskId: body.taskId, field: body.field, repo: resolved });

    return apiResponse({ success: true, taskId: body.taskId, field: body.field, repo: resolved }, "actions/tasks", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.update",
      target: body.taskId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/tasks", 500);
  }
}
