// =============================================================================
// AiDevOps Command Center — Mock Data
// All mock data for Phase 1 frontend prototype
// =============================================================================

export const systemMock = {
  vps: {
    hostname: "vps-01",
    ip: "203.0.113.10",
    provider: "VPS Provider",
    os: "Ubuntu 24.04",
    status: "healthy" as const,
    uptime: "41d 7h 23m",
    cpu: { current: 23, history: [18, 22, 19, 31, 23, 25, 20, 23] },
    ram: { used: 3.9, total: 8, pct: 61 },
    disk: { used: 44, total: 100, pct: 44 },
    sshLatency: 42,
    lastSSH: "2026-02-24T09:14:00Z",
    services: [
      { name: "nginx", status: "running" as const },
      { name: "node (app)", status: "running" as const },
      { name: "certbot", status: "idle" as const },
      { name: "fail2ban", status: "running" as const },
    ],
  },
  local: {
    hostname: "mac-mini-m4pro",
    chip: "Apple M4 Pro",
    memory: { used: 46.1, total: 64, pct: 72, pressure: "nominal" as const },
    cpu: { efficiency: 8, performance: 42, combined: 14 },
    gpu: { utilization: 31, metalActive: true },
    disk: { used: 380, total: 1000, pct: 38 },
    uptime: "12d 3h 51m",
    status: "healthy" as const,
  },
  tailscale: {
    status: "connected" as const,
    nodes: [
      { name: "mac-mini-m4pro", online: true, lastSeen: "now", ip: "100.x.x.1" },
      { name: "vps-01", online: true, lastSeen: "now", ip: "100.x.x.2" },
      { name: "iphone", online: true, lastSeen: "2m ago", ip: "100.x.x.3" },
      { name: "macbook", online: false, lastSeen: "3d ago", ip: "100.x.x.4" },
    ],
  },
};

export const ollamaMock = {
  status: "running" as const,
  loaded: [
    { name: "qwen2.5-coder:32b", size: "18.5 GB", quant: "Q4_K_M", vram: 19.2 },
    { name: "llama3.3:70b", size: "39.6 GB", quant: "Q4_K_M", vram: 41.0 },
  ],
  available: [
    "qwen2.5-coder:32b",
    "llama3.3:70b",
    "deepseek-r1:32b",
    "nomic-embed-text",
    "codellama:34b",
    "mistral:7b",
    "phi-3:14b",
  ],
  inference: { queue: 0, avgLatency: 890, tokensPerSec: 42.8 },
  memoryTotal: 64,
  memoryUsed: 60.2,
};

export const tokensMock = {
  budget: {
    monthlyCap: 400,
    currentMonth: 284.5,
    projectedMonth: 362,
    today: 12.84,
    thisWeek: 64.2,
    dailyHistory: [8.2, 11.4, 9.7, 14.2, 12.1, 10.8, 13.5, 12.8, 9.1, 15.3, 11.6, 12.9, 10.4, 12.84],
  },
  byModel: [
    { model: "Opus 4.5", tokens: 7736400, cost: 119.5, pct: 42, requests: 312, inputTokens: 5200000, outputTokens: 2536400 },
    { model: "Sonnet 4.5", tokens: 6447000, cost: 96.7, pct: 35, requests: 891, inputTokens: 4100000, outputTokens: 2347000 },
    { model: "Haiku 4.5", tokens: 1473600, cost: 7.4, pct: 8, requests: 2240, inputTokens: 980000, outputTokens: 493600 },
    { model: "Local (Ollama)", tokens: 2763000, cost: 0, pct: 15, requests: 445, inputTokens: 1800000, outputTokens: 963000 },
  ],
  modelPerformance: [
    { model: "Opus 4.5", success: 98.7, avgLatency: 2840, p95: 4200, p99: 6100, retries: 3, timeouts: 1, rateLimits: 0 },
    { model: "Sonnet 4.5", success: 99.2, avgLatency: 1420, p95: 2100, p99: 3400, retries: 1, timeouts: 0, rateLimits: 0 },
    { model: "Haiku 4.5", success: 99.8, avgLatency: 380, p95: 620, p99: 940, retries: 0, timeouts: 0, rateLimits: 0 },
    { model: "qwen2.5-coder:32b", success: 100, avgLatency: 890, p95: 1400, p99: 2100, retries: 0, timeouts: 0, rateLimits: 0 },
    { model: "llama3.3:70b", success: 99.1, avgLatency: 1650, p95: 2800, p99: 4200, retries: 2, timeouts: 1, rateLimits: 0 },
  ],
  localVsApi: { local: 15, api: 85 },
};

export const needsMock = [
  { id: 1, type: "review" as const, priority: "critical" as const, title: "PR #47: App export optimization", source: "GitHub", age: "2h", project: "acme-app", impact: "Blocks next deploy" },
  { id: 2, type: "approval" as const, priority: "high" as const, title: "Deploy storefront theme v2.8.1 to production", source: "CI/CD", age: "45m", project: "acme-store", impact: "Staging verified, waiting on go" },
  { id: 3, type: "security" as const, priority: "critical" as const, title: "2 HIGH vulnerabilities in node_modules", source: "Snyk", age: "1d", project: "acme-app", impact: "Exposed in production" },
  { id: 4, type: "expiring" as const, priority: "medium" as const, title: "SSL cert for app.example.com — 12 days", source: "Cert Monitor", age: "—", project: "infrastructure", impact: "Site goes insecure" },
  { id: 5, type: "failure" as const, priority: "high" as const, title: "E2E tests failing on main branch", source: "GitHub Actions", age: "3h", project: "acme-app", impact: "Merges blocked" },
  { id: 6, type: "agent" as const, priority: "medium" as const, title: "@seo agent needs strategy decision on keyword cannibalization", source: "Matrix/#seo-ops", age: "6h", project: "acme-web", impact: "SEO work paused" },
  { id: 7, type: "overdue" as const, priority: "low" as const, title: "CRM custom view cleanup — 3 days overdue", source: "TODO.md", age: "3d", project: "acme-crm", impact: "Technical debt" },
];

export const projectsMock = [
  {
    name: "acme-app",
    description: "Web application — React/TS + Canvas + 3D rendering",
    repo: "github.com/youruser/acme-app",
    platform: "github" as const,
    branch: "main",
    lastCommit: { sha: "a3f8c21", message: "fix: export resolution on retina displays", author: "opus-4.5", time: "2h ago" },
    ci: "failing" as const,
    quality: "A",
    issues: 4,
    prs: 2,
    vulns: { critical: 0, high: 2, medium: 5 },
    language: "TypeScript",
    category: "Acme Corp",
    tokenSpend: 89.2,
    lastDeploy: "2026-02-22T14:30:00Z",
  },
  {
    name: "acme-store",
    description: "E-commerce storefront — custom pricing, invoice payments",
    repo: "github.com/youruser/acme-store",
    platform: "github" as const,
    branch: "main",
    lastCommit: { sha: "e7b2d94", message: "feat: add name-your-price invoice flow", author: "opus-4.5", time: "1d ago" },
    ci: "passing" as const,
    quality: "A-",
    issues: 1,
    prs: 1,
    vulns: { critical: 0, high: 0, medium: 2 },
    language: "TypeScript",
    category: "Acme Corp",
    tokenSpend: 42.1,
    lastDeploy: "2026-02-23T09:15:00Z",
  },
  {
    name: "acme-web",
    description: "Marketing site — SEO optimized, lead capture integration",
    repo: "github.com/youruser/acme-web",
    platform: "github" as const,
    branch: "main",
    lastCommit: { sha: "1c9f0ab", message: "seo: restructure H1 tags to resolve cannibalization", author: "sonnet-4.5", time: "6h ago" },
    ci: "passing" as const,
    quality: "B+",
    issues: 3,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 0 },
    language: "HTML/CSS",
    category: "Acme Corp",
    tokenSpend: 31.4,
    lastDeploy: "2026-02-24T03:00:00Z",
  },
  {
    name: "aidevops-dashboard",
    description: "This dashboard — Command Center plugin for aidevops",
    repo: "github.com/youruser/aidevops-dashboard",
    platform: "github" as const,
    branch: "main",
    lastCommit: { sha: "0000000", message: "initial: phase 1 scaffold", author: "opus-4.6", time: "just now" },
    ci: "none" as const,
    quality: "—",
    issues: 0,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 0 },
    language: "TypeScript",
    category: "Infrastructure",
    tokenSpend: 0,
    lastDeploy: null,
  },
  {
    name: "my-infra",
    description: "Infrastructure configs — Tailscale, Ollama, server provisioning",
    repo: "github.com/youruser/my-infra",
    platform: "github" as const,
    branch: "main",
    lastCommit: { sha: "f42a891", message: "chore: update ollama model list", author: "user", time: "3d ago" },
    ci: "passing" as const,
    quality: "B",
    issues: 0,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 1 },
    language: "Shell",
    category: "Infrastructure",
    tokenSpend: 15.8,
    lastDeploy: null,
  },
];

export const kanbanMock = {
  backlog: [
    { id: "t-010", title: "Add webhook for lead scoring updates", project: "acme-crm", priority: "low" as const, agent: null, estimate: "~2h" },
    { id: "t-011", title: "Implement dark mode for app", project: "acme-app", priority: "medium" as const, agent: null, estimate: "~6h" },
    { id: "t-012", title: "Research communities for Q2 promo push", project: "acme-web", priority: "low" as const, agent: null, estimate: "~3h" },
    { id: "t-013", title: "Evaluate Cloudflare Workers for edge caching", project: "infrastructure", priority: "medium" as const, agent: null, estimate: "~4h" },
  ],
  planned: [
    { id: "t-007", title: "Build CRM forms → email sequence bridge", project: "acme-crm", priority: "high" as const, agent: "@code", estimate: "~8h", plan: "3-step integration via webhook" },
    { id: "t-008", title: "Implement GA4 enhanced ecommerce tracking", project: "acme-store", priority: "medium" as const, agent: "@seo", estimate: "~4h", plan: "Use GTM dataLayer push" },
  ],
  inProgress: [
    { id: "t-003", title: "Fix app export resolution on retina displays", project: "acme-app", priority: "high" as const, agent: "@code", estimate: "~4h", started: "2026-02-24T07:00:00Z", elapsed: "5h" },
    { id: "t-004", title: "Resolve keyword cannibalization: homepage vs /products", project: "acme-web", priority: "high" as const, agent: "@seo", estimate: "~6h", started: "2026-02-24T03:00:00Z", elapsed: "9h" },
    { id: "t-005", title: "aidevops-dashboard Phase 1 mockup", project: "aidevops-dashboard", priority: "high" as const, agent: "@code", estimate: "~16h", started: "2026-02-24T10:00:00Z", elapsed: "2h" },
  ],
  pendingApproval: [
    { id: "t-001", title: "PR #47: App export optimization", project: "acme-app", priority: "critical" as const, agent: "@code", waiting: "2h", requires: "Code review + merge" },
    { id: "t-002", title: "Deploy storefront theme v2.8.1", project: "acme-store", priority: "high" as const, agent: "@deploy", waiting: "45m", requires: "Production deploy approval" },
  ],
  recentlyCompleted: [
    { id: "t-020", title: "Add quantity restriction metafields to store", project: "acme-store", completed: "2026-02-23T16:00:00Z", agent: "@code", elapsed: "3h" },
    { id: "t-021", title: "Create custom CRM views for app leads", project: "acme-crm", completed: "2026-02-23T11:00:00Z", agent: "@code", elapsed: "2h" },
    { id: "t-022", title: "Update documentation for new API endpoints", project: "acme-app", completed: "2026-02-22T19:00:00Z", agent: null, elapsed: "1h" },
    { id: "t-023", title: "Update Ollama models to latest quantizations", project: "infrastructure", completed: "2026-02-22T14:00:00Z", agent: "@code", elapsed: "30m" },
    { id: "t-024", title: "SEO audit: Map all H1/H2 tags across example.com", project: "acme-web", completed: "2026-02-21T22:00:00Z", agent: "@seo", elapsed: "4h" },
  ],
};

export const agentsMock = {
  primary: [
    { name: "@code", desc: "Primary coding agent", status: "active" as const, lastUsed: "2m ago", subagents: 142, mcps: ["github", "filesystem", "code-quality"] },
    { name: "@seo", desc: "SEO analysis and optimization", status: "active" as const, lastUsed: "6h ago", subagents: 48, mcps: ["search-console", "ahrefs", "dataforseo"] },
    { name: "@deploy", desc: "Deployment and CI/CD", status: "idle" as const, lastUsed: "1d ago", subagents: 35, mcps: ["github-actions", "ssh", "docker"] },
    { name: "@wordpress", desc: "WordPress management", status: "idle" as const, lastUsed: "3d ago", subagents: 67, mcps: ["mainwp", "localwp", "wp-rest"] },
    { name: "@browser", desc: "Browser automation", status: "idle" as const, lastUsed: "2d ago", subagents: 28, mcps: ["playwright", "crawl4ai", "stagehand"] },
    { name: "@code-quality", desc: "Code quality enforcement", status: "idle" as const, lastUsed: "1d ago", subagents: 52, mcps: ["sonarcloud", "codacy", "codefactor"] },
    { name: "@vps-a", desc: "VPS provider A management", status: "idle" as const, lastUsed: "5d ago", subagents: 31, mcps: ["vps-api", "ssh"] },
    { name: "@vps-b", desc: "VPS provider B management", status: "idle" as const, lastUsed: "2d ago", subagents: 24, mcps: ["vps-api", "ssh"] },
    { name: "@git", desc: "Git platform operations", status: "idle" as const, lastUsed: "4h ago", subagents: 41, mcps: ["github", "gitlab", "gitea"] },
    { name: "@agent-review", desc: "Session review and agent improvement", status: "idle" as const, lastUsed: "1d ago", subagents: 18, mcps: [] },
    { name: "@document", desc: "Document creation and conversion", status: "idle" as const, lastUsed: "2d ago", subagents: 22, mcps: ["pandoc"] },
  ],
  mcpServers: [
    { name: "github", status: "connected" as const, loading: "eager" as const, lastPing: "12s ago" },
    { name: "filesystem", status: "connected" as const, loading: "eager" as const, lastPing: "8s ago" },
    { name: "ollama", status: "connected" as const, loading: "eager" as const, lastPing: "5s ago" },
    { name: "search-console", status: "connected" as const, loading: "on-demand" as const, lastPing: "6h ago" },
    { name: "sonarcloud", status: "disconnected" as const, loading: "on-demand" as const, lastPing: "1d ago" },
    { name: "vps-provider-a", status: "connected" as const, loading: "on-demand" as const, lastPing: "5d ago" },
    { name: "vps-provider-b", status: "connected" as const, loading: "on-demand" as const, lastPing: "2d ago" },
    { name: "playwright", status: "stopped" as const, loading: "on-demand" as const, lastPing: "2d ago" },
    { name: "crawl4ai", status: "stopped" as const, loading: "on-demand" as const, lastPing: "3d ago" },
    { name: "pandoc", status: "connected" as const, loading: "eager" as const, lastPing: "30s ago" },
  ],
  skillScans: {
    lastScan: "2026-02-23T08:00:00Z",
    totalSkills: 47,
    blocked: 0,
    warnings: 3,
  },
};

export const documentsMock = {
  tree: [
    {
      type: "dir" as const,
      name: ".agent-workspace",
      children: [
        {
          type: "dir" as const,
          name: "work",
          children: [
            { type: "dir" as const, name: "wordpress", children: [] },
            { type: "dir" as const, name: "hosting", children: [] },
            {
              type: "dir" as const,
              name: "seo",
              children: [
                { type: "file" as const, name: "cannibalization-audit.md", size: "4.2 KB", modified: "6h ago" },
                { type: "file" as const, name: "keyword-map.md", size: "8.1 KB", modified: "1d ago" },
              ],
            },
            {
              type: "dir" as const,
              name: "development",
              children: [
                { type: "file" as const, name: "app-architecture.md", size: "12.4 KB", modified: "3d ago" },
              ],
            },
          ],
        },
        {
          type: "dir" as const,
          name: "memory",
          children: [
            { type: "file" as const, name: "session-2026-02-24.md", size: "6.8 KB", modified: "2h ago" },
            { type: "file" as const, name: "session-2026-02-23.md", size: "14.2 KB", modified: "1d ago" },
          ],
        },
        { type: "dir" as const, name: "tmp", children: [] },
      ],
    },
    { type: "file" as const, name: "AGENTS.md", size: "28.4 KB", modified: "2d ago" },
    { type: "file" as const, name: "TODO.md", size: "5.6 KB", modified: "2h ago" },
    { type: "file" as const, name: "PLANS.md", size: "3.1 KB", modified: "1d ago" },
  ],
};

export const settingsMock = {
  framework: { version: "2.15.2", latest: "2.15.2", updateAvailable: false },
  apiKeys: [
    { service: "Anthropic", configured: true, lastRotated: "2026-01-15", status: "valid" as const },
    { service: "GitHub", configured: true, lastRotated: "2026-02-01", status: "valid" as const },
    { service: "Ahrefs", configured: true, lastRotated: "2025-12-20", status: "valid" as const },
    { service: "DataForSEO", configured: true, lastRotated: "2025-11-10", status: "expiring" as const },
    { service: "updown.io", configured: true, lastRotated: "2026-01-01", status: "valid" as const },
    { service: "SonarCloud", configured: false, lastRotated: null, status: "missing" as const },
    { service: "VirusTotal", configured: true, lastRotated: "2025-12-01", status: "valid" as const },
  ],
  models: {
    primary: "claude-opus-4-6",
    fallback: "claude-sonnet-4-5-20250929",
    local: "qwen2.5-coder:32b",
  },
};

export const uptimeMock = [
  { name: "example.com", url: "https://example.com", status: "up" as const, uptime7d: 99.98, uptime30d: 99.94, responseTime: 342, history: [320, 335, 410, 342] },
  { name: "app.example.com", url: "https://app.example.com", status: "up" as const, uptime7d: 99.87, uptime30d: 99.82, responseTime: 580, history: [610, 560, 595, 580] },
  { name: "VPS API", url: "https://api.example.com", status: "up" as const, uptime7d: 100, uptime30d: 99.99, responseTime: 89, history: [92, 85, 94, 89] },
];

// Recent activity for the overview page
export const recentActivityMock = [
  { id: 1, type: "commit" as const, message: "fix: export resolution on retina displays", project: "acme-app", agent: "opus-4.5", time: "2h ago" },
  { id: 2, type: "ci" as const, message: "E2E tests failed on main", project: "acme-app", agent: null, time: "3h ago" },
  { id: 3, type: "deploy" as const, message: "Deployed v2.8.0 to staging", project: "acme-store", agent: "@deploy", time: "4h ago" },
  { id: 4, type: "agent" as const, message: "@seo started keyword cannibalization analysis", project: "acme-web", agent: "@seo", time: "6h ago" },
  { id: 5, type: "commit" as const, message: "seo: restructure H1 tags", project: "acme-web", agent: "sonnet-4.5", time: "6h ago" },
  { id: 6, type: "security" as const, message: "Snyk found 2 HIGH vulnerabilities", project: "acme-app", agent: null, time: "1d ago" },
  { id: 7, type: "commit" as const, message: "feat: add name-your-price invoice flow", project: "acme-store", agent: "opus-4.5", time: "1d ago" },
  { id: 8, type: "agent" as const, message: "@code completed CRM view creation", project: "acme-crm", agent: "@code", time: "1d ago" },
];
