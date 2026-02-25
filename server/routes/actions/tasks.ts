import { config } from "../../config";
import { TodoWriter } from "../../writers/todo-writer";
import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { broadcast } from "../../ws/realtime";
import { cacheInvalidate } from "../../cache/store";
import { apiResponse, apiError } from "../_helpers";

const todoPath = `${config.aidevopsRepo}/TODO.md`;
const writer = new TodoWriter(todoPath);

export async function handleTaskMove(req: Request): Promise<Response> {
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { taskId: string; from: string; to: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/tasks", 400);
  }

  if (!body.taskId || !body.from || !body.to) {
    return apiError("BAD_REQUEST", "Missing required fields: taskId, from, to", "actions/tasks", 400);
  }

  try {
    await writer.moveTask(body.taskId, body.from, body.to);

    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.move",
      target: body.taskId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    // Invalidate tasks cache and broadcast update
    cacheInvalidate("tasks");
    broadcast("tasks", { action: "move", taskId: body.taskId, from: body.from, to: body.to });

    return apiResponse({ success: true, taskId: body.taskId, from: body.from, to: body.to }, "actions/tasks", 0);
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
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: {
    title: string;
    column: string;
    project?: string;
    priority?: string;
    agent?: string;
    estimate?: string;
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
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidate("tasks");
    broadcast("tasks", { action: "create", taskId });

    return apiResponse({ success: true, taskId }, "actions/tasks", 0);
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
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { taskId: string; field: string; value: string };

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

  try {
    await writer.updateTaskField(body.taskId, body.field, body.value);

    logAudit({
      ts: new Date().toISOString(),
      action: "tasks.update",
      target: body.taskId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidate("tasks");
    broadcast("tasks", { action: "update", taskId: body.taskId, field: body.field });

    return apiResponse({ success: true, taskId: body.taskId, field: body.field }, "actions/tasks", 0);
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
