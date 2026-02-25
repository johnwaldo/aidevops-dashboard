import { config } from "../config";
import { hasSecret } from "../secrets";
import { getAidevopsStatus } from "../parsers/status-parser";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleSettings(_req: Request): Promise<Response> {
  const cacheKey = "settings";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const status = await getAidevopsStatus();

    // Check which API keys are configured (names only, never values)
    // Uses hasSecret() which checks: gopass → gh auth → env var
    const secretChecks = [
      { secret: "GITHUB_TOKEN", service: "GitHub" },
      { secret: "UPDOWN_API_KEY", service: "updown.io" },
      { secret: "ANTHROPIC_API_KEY", service: "Anthropic" },
      { secret: "AHREFS_API_KEY", service: "Ahrefs" },
      { secret: "DATAFORSEO_LOGIN", service: "DataForSEO" },
      { secret: "SONARCLOUD_TOKEN", service: "SonarCloud" },
    ];

    const results = await Promise.all(secretChecks.map((s) => hasSecret(s.secret)));
    const apiKeys = secretChecks.map((s, i) => ({
      service: s.service,
      configured: results[i],
      status: results[i] ? "valid" : "missing",
    }));

    const result = {
      framework: {
        version: status.version.installed,
        latest: status.version.latest,
        updateAvailable: status.version.updateAvailable,
        repoPath: config.aidevopsRepo,
        agentsPath: config.aidevopsAgents,
      },
      apiKeys,
      models: {
        primary: "claude-opus-4-6",
        fallback: "claude-sonnet-4-6",
        local: "qwen2.5-coder:32b",
      },
      features: {
        vps: config.enableVPS,
        git: config.enableGit,
        uptime: config.enableUptime,
      },
      statusSections: status.sections,
    };

    cacheSet(cacheKey, result, CACHE_TTL.settings);
    return apiResponse(result, "cli", CACHE_TTL.settings);
  } catch (err) {
    return apiError("CONFIG_ERROR", String(err), "settings");
  }
}
