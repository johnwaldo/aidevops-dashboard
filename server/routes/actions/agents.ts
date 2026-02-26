import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { apiResponse, apiError } from "../_helpers";
import { config } from "../../config";
import * as fs from "fs";

// Shell metacharacters that could enable command injection
const DANGEROUS_CHARS = /[;&|`$(){}[\]<>\\!#*?"'\n\r]/;

// Maximum command length to prevent abuse
const MAX_COMMAND_LENGTH = 2000;

export async function handleAgentDispatch(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { agent: string; command: string; project?: string; workDir?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/agents", 400);
  }

  if (!body.agent || !body.command) {
    return apiError("BAD_REQUEST", "Missing required fields: agent, command", "actions/agents", 400);
  }

  // Sanitize agent name — prevent command injection
  if (!/^[\w@-]+$/.test(body.agent)) {
    return apiError("BAD_REQUEST", "Invalid agent name", "actions/agents", 400);
  }

  // Sanitize command — reject shell metacharacters
  if (DANGEROUS_CHARS.test(body.command)) {
    return apiError("BAD_REQUEST", "Command contains invalid characters", "actions/agents", 400);
  }

  // Limit command length
  if (body.command.length > MAX_COMMAND_LENGTH) {
    return apiError("BAD_REQUEST", `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters`, "actions/agents", 400);
  }

  // Validate workDir — must be within allowed directories
  let cwd = body.workDir ?? body.project ?? process.env.HOME ?? "/tmp";
  if (body.workDir) {
    const allowedDirs = [
      config.aidevopsDir,
      config.aidevopsAgents,
      config.aidevopsRepo,
      config.workspaceDir,
      config.gitDir,
      process.env.HOME,
      "/tmp",
    ].filter(Boolean);

    const isAllowed = allowedDirs.some(allowed => cwd.startsWith(allowed));
    if (!isAllowed) {
      return apiError("BAD_REQUEST", "workDir must be within allowed directories", "actions/agents", 400);
    }

    // Verify directory exists
    if (!fs.existsSync(cwd)) {
      return apiError("BAD_REQUEST", "workDir does not exist", "actions/agents", 400);
    }
  }

  try {
    // Spawn as detached background process
    const proc = Bun.spawn(["claude", "-p", `@${body.agent} ${body.command}`], {
      cwd,
      stdout: "ignore",
      stderr: "ignore",
    });

    logAudit({
      ts: new Date().toISOString(),
      action: "agents.dispatch",
      target: body.agent,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    return apiResponse(
      { dispatched: true, agent: body.agent, pid: proc.pid },
      "actions/agents",
      0,
    );
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "agents.dispatch",
      target: body.agent,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("DISPATCH_FAILED", String(err instanceof Error ? err.message : err), "actions/agents", 500);
  }
}
