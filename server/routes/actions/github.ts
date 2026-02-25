import { getSecret } from "../../secrets";
import { logAudit, sanitizeParams } from "../../writers/audit-log";
import { writeAuthMiddleware } from "../../middleware/write-auth";
import { cacheInvalidatePrefix } from "../../cache/store";
import { apiResponse, apiError } from "../_helpers";

async function githubApi(path: string, method: string, body?: unknown): Promise<Response> {
  const token = await getSecret("GITHUB_TOKEN");
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  return res;
}

export async function handlePRApprove(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { owner: string; repo: string; prNumber: number };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/github", 400);
  }

  if (!body.owner || !body.repo || !body.prNumber) {
    return apiError("BAD_REQUEST", "Missing required fields: owner, repo, prNumber", "actions/github", 400);
  }

  try {
    await githubApi(
      `/repos/${body.owner}/${body.repo}/pulls/${body.prNumber}/reviews`,
      "POST",
      { event: "APPROVE" },
    );

    logAudit({
      ts: new Date().toISOString(),
      action: "github.pr.approve",
      target: `${body.owner}/${body.repo}#${body.prNumber}`,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidatePrefix("projects");
    cacheInvalidatePrefix("needs");

    return apiResponse({ success: true, pr: `${body.owner}/${body.repo}#${body.prNumber}` }, "actions/github", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "github.pr.approve",
      target: `${body.owner}/${body.repo}#${body.prNumber}`,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("GITHUB_ERROR", String(err instanceof Error ? err.message : err), "actions/github", 502);
  }
}

export async function handlePRMerge(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { owner: string; repo: string; prNumber: number; method?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/github", 400);
  }

  if (!body.owner || !body.repo || !body.prNumber) {
    return apiError("BAD_REQUEST", "Missing required fields: owner, repo, prNumber", "actions/github", 400);
  }

  const mergeMethod = body.method ?? "squash";

  try {
    await githubApi(
      `/repos/${body.owner}/${body.repo}/pulls/${body.prNumber}/merge`,
      "PUT",
      { merge_method: mergeMethod },
    );

    logAudit({
      ts: new Date().toISOString(),
      action: "github.pr.merge",
      target: `${body.owner}/${body.repo}#${body.prNumber}`,
      params: sanitizeParams({ ...body, method: mergeMethod } as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidatePrefix("projects");
    cacheInvalidatePrefix("needs");
    cacheInvalidatePrefix("ci");

    return apiResponse({ success: true, pr: `${body.owner}/${body.repo}#${body.prNumber}`, method: mergeMethod }, "actions/github", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "github.pr.merge",
      target: `${body.owner}/${body.repo}#${body.prNumber}`,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("GITHUB_ERROR", String(err instanceof Error ? err.message : err), "actions/github", 502);
  }
}

export async function handleWorkflowRerun(req: Request): Promise<Response> {
  const { blocked, auth } = await writeAuthMiddleware(req);
  if (blocked) return blocked;

  const start = Date.now();
  let body: { owner: string; repo: string; runId: number };

  try {
    body = await req.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body", "actions/github", 400);
  }

  if (!body.owner || !body.repo || !body.runId) {
    return apiError("BAD_REQUEST", "Missing required fields: owner, repo, runId", "actions/github", 400);
  }

  try {
    await githubApi(
      `/repos/${body.owner}/${body.repo}/actions/runs/${body.runId}/rerun`,
      "POST",
    );

    logAudit({
      ts: new Date().toISOString(),
      action: "github.workflow.rerun",
      target: `${body.owner}/${body.repo}/runs/${body.runId}`,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "success",
      durationMs: Date.now() - start,
    });

    cacheInvalidatePrefix("ci");

    return apiResponse({ success: true, runId: body.runId }, "actions/github", 0);
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: "github.workflow.rerun",
      target: `${body.owner}/${body.repo}/runs/${body.runId}`,
      params: sanitizeParams(body as unknown as Record<string, unknown>),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });

    return apiError("GITHUB_ERROR", String(err instanceof Error ? err.message : err), "actions/github", 502);
  }
}
