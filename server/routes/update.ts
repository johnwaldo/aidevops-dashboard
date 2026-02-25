import { join } from "path";
import { cacheGet, cacheSet, cacheInvalidate } from "../cache/store";
import { logAudit } from "../writers/audit-log";
import { writeAuthMiddleware } from "../middleware/write-auth";
import { logger } from "../health/logger";
import { apiResponse, apiError } from "./_helpers";

const REPO_DIR = join(import.meta.dir, "../..");
const LABEL = "com.aidevops.dashboard";

export interface UpdateStatus {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  commitsBehind: number;
  currentSha: string;
  latestSha: string;
}

async function runScript(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
    cwd: REPO_DIR,
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

/** Check if the LaunchAgent is loaded */
async function isLaunchdManaged(): Promise<boolean> {
  try {
    const { stdout } = await runScript(["launchctl", "list"]);
    return stdout.includes(LABEL);
  } catch {
    return false;
  }
}

export async function handleUpdateCheck(_req: Request): Promise<Response> {
  const cacheKey = "updateCheck";
  const cached = cacheGet<UpdateStatus>(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const { stdout, exitCode } = await runScript([join(REPO_DIR, "update.sh"), "--check"]);

    // exit 0 = update available, exit 1 = up to date, both return JSON
    let status: UpdateStatus;
    try {
      status = JSON.parse(stdout);
    } catch {
      status = {
        updateAvailable: false,
        currentVersion: "unknown",
        latestVersion: "unknown",
        commitsBehind: 0,
        currentSha: "unknown",
        latestSha: "unknown",
      };
    }

    // Cache for 10 minutes (don't hammer GitHub)
    cacheSet(cacheKey, status, 600);
    return apiResponse(status, "git", 600);
  } catch (err) {
    return apiError("UPDATE_CHECK_FAILED", String(err), "update/check");
  }
}

export async function handleUpdateApply(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();

  try {
    const { stdout, stderr, exitCode } = await runScript([join(REPO_DIR, "update.sh")]);

    const success = exitCode === 0;

    logAudit({
      ts: new Date().toISOString(),
      action: "dashboard.update",
      target: "aidevops-dashboard",
      params: {},
      user: auth.user ?? "unknown",
      result: success ? "success" : "failure",
      error: success ? undefined : stderr || `exit code ${exitCode}`,
      durationMs: Date.now() - start,
    });

    // Invalidate update cache so next check reflects new state
    cacheInvalidate("updateCheck");

    if (!success) {
      return apiError("UPDATE_FAILED", stderr || `update.sh exited with code ${exitCode}`, "actions/update", 502);
    }

    // Parse new version from output
    const versionMatch = stdout.match(/Updated to v([\d.]+)/);
    const newVersion = versionMatch?.[1] ?? "unknown";

    // update.sh now handles the launchctl restart itself, but if the server
    // is running outside launchd (dev mode), the caller still needs to know
    const managed = await isLaunchdManaged();

    return apiResponse({
      success: true,
      newVersion,
      output: stdout.split("\n").slice(-5),
      restartRequired: !managed,
      launchdRestart: managed,
    }, "actions/update", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "dashboard.update",
      target: "aidevops-dashboard",
      params: {},
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("UPDATE_ERROR", String(err instanceof Error ? err.message : err), "actions/update", 502);
  }
}
