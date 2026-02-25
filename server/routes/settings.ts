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
    const [hasGithub, hasUpdown] = await Promise.all([
      hasSecret("GITHUB_TOKEN"),
      hasSecret("UPDOWN_API_KEY"),
    ]);
    const apiKeys = [
      { service: "GitHub", configured: hasGithub, status: hasGithub ? "valid" : "missing" },
      { service: "updown.io", configured: hasUpdown, status: hasUpdown ? "valid" : "missing" },
    ];

    // Try to detect more keys from environment
    const envKeys = [
      { env: "ANTHROPIC_API_KEY", service: "Anthropic" },
      { env: "AHREFS_API_KEY", service: "Ahrefs" },
      { env: "DATAFORSEO_LOGIN", service: "DataForSEO" },
      { env: "SONARCLOUD_TOKEN", service: "SonarCloud" },
    ];

    for (const { env, service } of envKeys) {
      const configured = !!process.env[env];
      apiKeys.push({ service, configured, status: configured ? "valid" : "missing" });
    }

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
