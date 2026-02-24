const HOME = process.env.HOME ?? "/Users/justin";

export const config = {
  port: Number(process.env.DASHBOARD_PORT ?? 3000),

  // Paths
  aidevopsDir: process.env.AIDEVOPS_DIR ?? `${HOME}/.aidevops`,
  aidevopsAgents: process.env.AIDEVOPS_AGENTS ?? `${HOME}/.aidevops/agents`,
  aidevopsRepo: process.env.AIDEVOPS_REPO ?? `${HOME}/Git/aidevops`,
  workspaceDir: process.env.WORKSPACE_DIR ?? `${HOME}/.aidevops/.agent-workspace`,
  gitDir: process.env.GIT_DIR ?? `${HOME}/Git`,

  // VPS SSH
  vpsHost: process.env.VPS_HOST ?? null,
  vpsUser: process.env.VPS_USER ?? "root",
  vpsPort: Number(process.env.VPS_PORT ?? 22),

  // Ollama
  ollamaHost: process.env.OLLAMA_HOST ?? "http://localhost:11434",

  // Token tracking
  claudeLogDir: process.env.CLAUDE_LOG_DIR ?? `${HOME}/.claude/projects`,

  // Feature flags
  enableVPS: process.env.ENABLE_VPS !== "false",
  enableGit: process.env.ENABLE_GIT !== "false",
  enableUptime: process.env.ENABLE_UPTIME !== "false",
  enablePagespeed: process.env.ENABLE_PAGESPEED !== "false",

  // Alert thresholds
  thresholds: {
    tokenBudget: {
      monthlyCap: Number(process.env.DASHBOARD_TOKEN_BUDGET ?? 400),
      dailyWarn: Number(process.env.DASHBOARD_TOKEN_DAILY_WARN ?? 25),
      monthlyWarnPct: 75,
      monthlyAlertPct: 90,
    },
    health: {
      cpuWarn: 80,
      ramWarn: 85,
      diskWarn: 90,
    },
    ssl: {
      expiryWarnDays: 14,
      expiryAlertDays: 7,
    },
    tasks: {
      overdueAfterDays: 7,
    },
    branches: {
      staleDays: 30,
    },
  },

  // PageSpeed
  pagespeedUrls: (process.env.PAGESPEED_URLS ?? "").split(",").filter(Boolean),

  // Secrets (loaded at startup)
  githubToken: null as string | null,
  updownApiKey: null as string | null,
};

export async function loadSecrets(): Promise<void> {
  try {
    const result = await Bun.spawn(["aidevops", "secret", "get", "GITHUB_TOKEN"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;
    if (result === 0) {
      // Secret loaded successfully — we don't store the value in config
      // Instead, routes that need it call getSecret() at request time
    }
  } catch {
    // gopass not available — fall back to env vars
  }

  config.githubToken = process.env.GITHUB_TOKEN ?? null;
  config.updownApiKey = process.env.UPDOWN_API_KEY ?? null;

  // Try gh auth token as fallback for GitHub
  if (!config.githubToken) {
    try {
      const proc = Bun.spawn(["gh", "auth", "token"], { stdout: "pipe", stderr: "pipe" });
      const text = await new Response(proc.stdout).text();
      await proc.exited;
      if (text.trim()) {
        config.githubToken = text.trim();
      }
    } catch {
      // gh not available
    }
  }
}
