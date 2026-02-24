import { collectTokenSummary, collectSessionCosts } from "../collectors/token-collector";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleTokens(_req: Request): Promise<Response> {
  const cacheKey = "tokens";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const summary = await collectTokenSummary();
    cacheSet(cacheKey, summary, CACHE_TTL.tokens);
    return apiResponse(summary, "filesystem", CACHE_TTL.tokens);
  } catch (err) {
    return apiError("TOKEN_SCAN_ERROR", String(err), "tokens");
  }
}

export async function handleTokenModels(_req: Request): Promise<Response> {
  const cacheKey = "tokens";
  const cached = cacheGet(cacheKey);

  try {
    const summary = cached ? (cached.data as Awaited<ReturnType<typeof collectTokenSummary>>) : await collectTokenSummary();
    if (!cached) {
      cacheSet(cacheKey, summary, CACHE_TTL.tokens);
    }

    return apiResponse(summary.byModel, "filesystem", CACHE_TTL.tokens, !!cached);
  } catch (err) {
    return apiError("TOKEN_SCAN_ERROR", String(err), "tokens/models");
  }
}

export async function handleTokenProjects(_req: Request): Promise<Response> {
  const cacheKey = "tokens";
  const cached = cacheGet(cacheKey);

  try {
    const summary = cached ? (cached.data as Awaited<ReturnType<typeof collectTokenSummary>>) : await collectTokenSummary();
    if (!cached) {
      cacheSet(cacheKey, summary, CACHE_TTL.tokens);
    }

    return apiResponse(summary.byProject, "filesystem", CACHE_TTL.tokens, !!cached);
  } catch (err) {
    return apiError("TOKEN_SCAN_ERROR", String(err), "tokens/projects");
  }
}

export async function handleTokenBudget(_req: Request): Promise<Response> {
  const cacheKey = "tokens";
  const cached = cacheGet(cacheKey);

  try {
    const summary = cached ? (cached.data as Awaited<ReturnType<typeof collectTokenSummary>>) : await collectTokenSummary();
    if (!cached) {
      cacheSet(cacheKey, summary, CACHE_TTL.tokens);
    }

    return apiResponse(summary.budgetStatus, "filesystem", CACHE_TTL.tokens, !!cached);
  } catch (err) {
    return apiError("TOKEN_SCAN_ERROR", String(err), "tokens/budget");
  }
}

export async function handleTokenSessions(_req: Request): Promise<Response> {
  const cacheKey = "token-sessions";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const sessions = await collectSessionCosts();
    cacheSet(cacheKey, sessions, CACHE_TTL.tokens);
    return apiResponse(sessions, "filesystem", CACHE_TTL.tokens);
  } catch (err) {
    return apiError("TOKEN_SCAN_ERROR", String(err), "tokens/sessions");
  }
}
