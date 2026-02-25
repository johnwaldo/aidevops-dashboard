import { config } from "../../config";
import { logAudit } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { cacheInvalidatePrefix } from "../../cache/store";
import { apiResponse, apiError } from "../_helpers";

export async function handleVPSUpdate(req: Request): Promise<Response> {
  const { blocked, auth } = writeAuthMiddleware(req);
  if (blocked) return blocked;

  if (!config.enableVPS || !config.vpsHost) {
    return apiError("NOT_CONFIGURED", "VPS not configured", "actions/vps", 400);
  }

  const start = Date.now();

  let body: { securityOnly?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const securityOnly = body.securityOnly ?? false;

  const updateCmd = securityOnly
    ? "DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d/ -f1 | tail -n+2) 2>&1 | tail -20"
    : "DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq 2>&1 | tail -20";

  try {
    const sshCmd = [
      "ssh",
      "-o", "ConnectTimeout=10",
      "-o", "StrictHostKeyChecking=no",
      "-p", String(config.vpsPort),
      `${config.vpsUser}@${config.vpsHost}`,
      updateCmd,
    ];

    const proc = Bun.spawn(sshCmd, { stdout: "pipe", stderr: "pipe" });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const success = exitCode === 0;

    logAudit({
      ts: new Date().toISOString(),
      action: securityOnly ? "vps.update.security" : "vps.update.all",
      target: config.vpsHost,
      params: { securityOnly },
      user: auth.user ?? "unknown",
      result: success ? "success" : "failure",
      error: success ? undefined : stderr.trim() || `exit code ${exitCode}`,
      durationMs: Date.now() - start,
    });

    // Invalidate VPS cache so next poll picks up new state
    cacheInvalidatePrefix("healthVPS");
    cacheInvalidatePrefix("needs");

    if (!success) {
      return apiError("UPDATE_FAILED", stderr.trim() || `apt-get exited with code ${exitCode}`, "actions/vps", 502);
    }

    return apiResponse({
      success: true,
      securityOnly,
      output: stdout.trim().split("\n").slice(-10),
    }, "actions/vps", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: securityOnly ? "vps.update.security" : "vps.update.all",
      target: config.vpsHost,
      params: { securityOnly },
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("SSH_ERROR", String(err instanceof Error ? err.message : err), "actions/vps", 502);
  }
}
