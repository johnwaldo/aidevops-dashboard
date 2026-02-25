import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { loadSettings, updateBudget, updateAlert, updateCollector, updateRefreshInterval, updateUpdateMode } from "../../writers/config-writer";
import { apiResponse, apiError } from "../_helpers";

export async function handleSettingsGet(_req: Request): Promise<Response> {
  const settings = loadSettings();
  return apiResponse(settings, "settings/dashboard", 0);
}

export async function handleBudgetUpdate(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { monthlyCap: number };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/settings", 400);
  }

  if (typeof body.monthlyCap !== "number" || body.monthlyCap <= 0) {
    return apiError("BAD_REQUEST", "monthlyCap must be a positive number", "actions/settings", 400);
  }

  try {
    const oldSettings = loadSettings();
    const settings = updateBudget(body.monthlyCap);

    logAudit({
      ts: new Date().toISOString(),
      action: "settings.budget",
      target: "monthlyCap",
      params: { old: oldSettings.tokenBudget.monthlyCap, new: body.monthlyCap },
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings, "actions/settings", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "settings.budget",
      target: "monthlyCap",
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/settings", 500);
  }
}

export async function handleAlertUpdate(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { ruleId: string; enabled: boolean; threshold?: number };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/settings", 400);
  }

  if (!body.ruleId || typeof body.enabled !== "boolean") {
    return apiError("BAD_REQUEST", "Missing required fields: ruleId, enabled", "actions/settings", 400);
  }

  try {
    const settings = updateAlert(body.ruleId, body.enabled, body.threshold);

    logAudit({
      ts: new Date().toISOString(),
      action: "settings.alert",
      target: body.ruleId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings, "actions/settings", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "settings.alert",
      target: body.ruleId,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/settings", 500);
  }
}

export async function handleCollectorToggle(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { collector: string; enabled: boolean };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/settings", 400);
  }

  if (!body.collector || typeof body.enabled !== "boolean") {
    return apiError("BAD_REQUEST", "Missing required fields: collector, enabled", "actions/settings", 400);
  }

  try {
    const settings = updateCollector(body.collector, body.enabled);

    logAudit({
      ts: new Date().toISOString(),
      action: "settings.collector",
      target: body.collector,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings, "actions/settings", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "settings.collector",
      target: body.collector,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/settings", 500);
  }
}

export async function handleRefreshIntervalUpdate(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { source: string; intervalSeconds: number };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/settings", 400);
  }

  if (!body.source || typeof body.intervalSeconds !== "number" || body.intervalSeconds < 5) {
    return apiError("BAD_REQUEST", "source required, intervalSeconds must be >= 5", "actions/settings", 400);
  }

  try {
    const settings = updateRefreshInterval(body.source, body.intervalSeconds);

    logAudit({
      ts: new Date().toISOString(),
      action: "settings.refreshInterval",
      target: body.source,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings, "actions/settings", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "settings.refreshInterval",
      target: body.source,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/settings", 500);
  }
}

export async function handleUpdateModeChange(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { mode: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/settings", 400);
  }

  if (body.mode !== "auto" && body.mode !== "manual") {
    return apiError("BAD_REQUEST", "mode must be 'auto' or 'manual'", "actions/settings", 400);
  }

  try {
    const oldSettings = loadSettings();
    const settings = updateUpdateMode(body.mode as "auto" | "manual");

    logAudit({
      ts: new Date().toISOString(),
      action: "settings.updateMode",
      target: "updateMode",
      params: { old: oldSettings.updateMode, new: body.mode },
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings, "actions/settings", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "settings.updateMode",
      target: "updateMode",
      params: { mode: body.mode },
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/settings", 500);
  }
}
