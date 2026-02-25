import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { apiResponse, apiError } from "../_helpers";

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

  const cwd = body.workDir ?? body.project ?? process.env.HOME ?? "/tmp";

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
