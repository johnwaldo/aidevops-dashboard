import { discoverRepos, type TrackedRepo } from "../services/repo-discovery";
import { getTrackedRepos, setTrackedRepos, toggleRepo, getEnabledRepos } from "../writers/config-writer";
import { restartFileWatchers } from "../watchers/file-watcher";
import { writeAuthMiddleware } from "../middleware/write-auth";
import { logAudit, sanitizeParams } from "../writers/audit-log";
import { apiResponse, apiError } from "./_helpers";

/** GET /api/repos — list tracked repos with their enabled state */
export async function handleRepos(_req: Request): Promise<Response> {
  const tracked = getTrackedRepos();
  return apiResponse(tracked, "settings", 0);
}

/** GET /api/repos/discover — scan filesystem for repos with TODO.md */
export async function handleReposDiscover(_req: Request): Promise<Response> {
  const discovered = discoverRepos();
  const tracked = getTrackedRepos();
  const trackedNames = new Set(tracked.map((r) => r.name));

  // Mark which discovered repos are already tracked
  const result = discovered.map((repo) => ({
    ...repo,
    tracked: trackedNames.has(repo.name),
    enabled: tracked.find((t) => t.name === repo.name)?.enabled ?? false,
  }));

  return apiResponse(result, "filesystem", 0);
}

/** POST /api/actions/repos/sync — sync tracked repos from discovery (add new, keep existing settings) */
export async function handleReposSync(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();

  try {
    const discovered = discoverRepos();
    const existing = getTrackedRepos();
    const existingMap = new Map(existing.map((r) => [r.name, r]));

    // Merge: keep existing enabled state, add new repos as enabled
    const merged: TrackedRepo[] = discovered.map((repo) => {
      const prev = existingMap.get(repo.name);
      return prev ? { ...repo, enabled: prev.enabled } : { ...repo, enabled: true };
    });

    const settings = setTrackedRepos(merged);
    restartFileWatchers();

    logAudit({
      ts: new Date().toISOString(),
      action: "repos.sync",
      target: "trackedRepos",
      params: { count: merged.length, new: merged.length - existing.length },
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings.trackedRepos, "actions/repos", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "repos.sync",
      target: "trackedRepos",
      params: {},
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/repos", 500);
  }
}

/** POST /api/actions/repos/toggle — enable/disable a tracked repo */
export async function handleRepoToggle(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { name: string; enabled: boolean };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/repos", 400);
  }

  if (!body.name || typeof body.enabled !== "boolean") {
    return apiError("BAD_REQUEST", "Missing required fields: name, enabled", "actions/repos", 400);
  }

  try {
    const settings = toggleRepo(body.name, body.enabled);
    restartFileWatchers();

    logAudit({
      ts: new Date().toISOString(),
      action: "repos.toggle",
      target: body.name,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(settings.trackedRepos, "actions/repos", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "repos.toggle",
      target: body.name,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("WRITE_FAILED", String(err instanceof Error ? err.message : err), "actions/repos", 500);
  }
}
