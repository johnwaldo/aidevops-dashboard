import { config } from "../config";
import { scanAgents } from "../parsers/skill-parser";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleAgents(_req: Request): Promise<Response> {
  const cacheKey = "agents";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const agents = await scanAgents(config.aidevopsAgents);

    const result = {
      agents: agents.map((a) => ({
        name: `@${a.name}`,
        desc: a.description,
        mode: a.mode,
        status: "idle" as const,
        subagents: a.subagents.length,
        subagentList: a.subagents,
        mcps: a.mcps,
      })),
      totalAgents: agents.length,
      totalSubagents: agents.reduce((sum, a) => sum + a.subagents.length, 0),
    };

    cacheSet(cacheKey, result, CACHE_TTL.agents);
    return apiResponse(result, "filesystem", CACHE_TTL.agents);
  } catch (err) {
    return apiError("SCAN_ERROR", String(err), "agents");
  }
}
