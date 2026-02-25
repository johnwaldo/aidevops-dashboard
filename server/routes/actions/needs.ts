import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { cacheInvalidate } from "../../cache/store";
import { broadcast } from "../../ws/realtime";
import { apiResponse, apiError } from "../_helpers";

const HOME = process.env.HOME ?? "/Users/justin";
const NEEDS_STATE_PATH = join(HOME, ".aidevops/dashboard/needs-state.json");

mkdirSync(join(HOME, ".aidevops/dashboard"), { recursive: true });

interface NeedsState {
  dismissed: string[];
  snoozed: Record<string, string>; // needId -> ISO date when snooze expires
}

function loadNeedsState(): NeedsState {
  try {
    if (existsSync(NEEDS_STATE_PATH)) {
      return JSON.parse(readFileSync(NEEDS_STATE_PATH, "utf-8"));
    }
  } catch {
    // Fall back to empty
  }
  return { dismissed: [], snoozed: {} };
}

function saveNeedsState(state: NeedsState): void {
  writeFileSync(NEEDS_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export function getNeedsState(): NeedsState {
  const state = loadNeedsState();

  // Clean expired snoozes
  const now = new Date().toISOString();
  let changed = false;
  for (const [id, until] of Object.entries(state.snoozed)) {
    if (until < now) {
      delete state.snoozed[id];
      changed = true;
    }
  }
  if (changed) saveNeedsState(state);

  return state;
}

export function isNeedHidden(needId: string): boolean {
  const state = getNeedsState();
  if (state.dismissed.includes(needId)) return true;
  const snoozedUntil = state.snoozed[needId];
  if (snoozedUntil && snoozedUntil > new Date().toISOString()) return true;
  return false;
}

export async function handleNeedDismiss(req: Request): Promise<Response> {
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { needId: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/needs", 400);
  }

  if (!body.needId) {
    return apiError("BAD_REQUEST", "Missing required field: needId", "actions/needs", 400);
  }

  try {
    const state = loadNeedsState();
    if (!state.dismissed.includes(body.needId)) {
      state.dismissed.push(body.needId);
    }
    // Also remove from snoozed if present
    delete state.snoozed[body.needId];
    saveNeedsState(state);

    logAudit({
      ts: new Date().toISOString(),
      action: "needs.dismiss",
      target: body.needId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidate("needs");
    broadcast("needs", { action: "dismiss", needId: body.needId });

    return apiResponse({ success: true, needId: body.needId }, "actions/needs", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "needs.dismiss",
      target: body.needId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/needs", 500);
  }
}

export async function handleNeedSnooze(req: Request): Promise<Response> {
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { needId: string; duration: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/needs", 400);
  }

  if (!body.needId || !body.duration) {
    return apiError("BAD_REQUEST", "Missing required fields: needId, duration", "actions/needs", 400);
  }

  // Parse duration: "1h", "2h", "4h", "1d", "3d", "7d"
  const match = body.duration.match(/^(\d+)([hd])$/);
  if (!match) {
    return apiError("BAD_REQUEST", "Invalid duration format. Use: 1h, 2h, 4h, 1d, 3d, 7d", "actions/needs", 400);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const ms = unit === "h" ? amount * 3600_000 : amount * 86400_000;
  const until = new Date(Date.now() + ms).toISOString();

  try {
    const state = loadNeedsState();
    state.snoozed[body.needId] = until;
    saveNeedsState(state);

    logAudit({
      ts: new Date().toISOString(),
      action: "needs.snooze",
      target: body.needId,
      params: { ...sanitizeParams(body as unknown as Record<string, unknown>), until },
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidate("needs");
    broadcast("needs", { action: "snooze", needId: body.needId, until });

    return apiResponse({ success: true, needId: body.needId, snoozedUntil: until }, "actions/needs", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "needs.snooze",
      target: body.needId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/needs", 500);
  }
}
