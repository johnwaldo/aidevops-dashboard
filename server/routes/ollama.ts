import { collectOllamaStatus } from "../collectors/ollama-collector";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleOllama(_req: Request): Promise<Response> {
  const cacheKey = "ollama";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const status = await collectOllamaStatus();
    cacheSet(cacheKey, status, CACHE_TTL.ollama);
    return apiResponse(status, "api", CACHE_TTL.ollama);
  } catch (err) {
    return apiError("OLLAMA_ERROR", String(err), "ollama");
  }
}
