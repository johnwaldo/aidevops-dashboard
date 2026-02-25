# Phase 1 — Frontend Mockup & Foundation

## Objective

Build the complete frontend UI for the AiDevOps Command Center dashboard with realistic mock data. Every page, panel, component, and interaction should be fully designed and functional in the browser. No backend. No live data. This is the visual prototype that validates the entire UX before any backend work begins.

## Setup Instructions

Initialize this as a new project:

```bash
# Create project
mkdir aidevops-dashboard && cd aidevops-dashboard
bun init -y

# Install frontend tooling
bun create vite client --template react-ts
cd client
bun install

# Install UI dependencies
bunx shadcn@latest init
# Choose: New York style, Zinc base color, CSS variables: yes

# Add all shadcn components we'll need
bunx shadcn@latest add card badge button tabs separator scroll-area avatar
bunx shadcn@latest add sheet sidebar tooltip dropdown-menu command dialog
bunx shadcn@latest add progress table input select switch label
bunx shadcn@latest add collapsible popover calendar checkbox

# Install additional dependencies
bun add recharts lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
bun add @tanstack/react-router @tanstack/react-table
bun add clsx tailwind-merge class-variance-authority
bun add -d @types/node

cd ..
```

## Project Structure

```
aidevops-dashboard/
├── plan.md                    # Master plan (all phases)
├── phase-1.md                 # This file
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   └── mock-data.ts          # ALL mock data in one file
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn components (auto-generated)
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx    # Main shell: sidebar + topbar + content
│   │   │   │   ├── Sidebar.tsx            # Left nav with page links
│   │   │   │   ├── TopBar.tsx             # Persistent status strip
│   │   │   │   └── CommandPalette.tsx     # Cmd+K search
│   │   │   ├── shared/
│   │   │   │   ├── StatusBadge.tsx        # green/yellow/red indicator
│   │   │   │   ├── Sparkline.tsx          # Tiny inline chart
│   │   │   │   ├── MetricCard.tsx         # Stat card with label, value, trend
│   │   │   │   ├── GaugeRing.tsx          # Circular progress gauge
│   │   │   │   ├── PriorityDot.tsx        # Priority color indicator
│   │   │   │   └── TimeAgo.tsx            # Relative timestamp display
│   │   │   ├── overview/
│   │   │   │   ├── SystemStatus.tsx       # Uptime + resource mini gauges
│   │   │   │   ├── TokenBudgetBar.tsx     # Budget progress with projection
│   │   │   │   ├── NeedsBadge.tsx         # Action required counter
│   │   │   │   ├── QuickStats.tsx         # Commits, sessions, PRs, issues
│   │   │   │   └── RecentActivity.tsx     # Last 5 agent/system events
│   │   │   ├── projects/
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   ├── ProjectGrid.tsx
│   │   │   │   └── ProjectDetail.tsx
│   │   │   ├── kanban/
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   └── TaskCard.tsx
│   │   │   ├── health/
│   │   │   │   ├── ServerPanel.tsx
│   │   │   │   ├── OllamaPanel.tsx
│   │   │   │   ├── NetworkPanel.tsx
│   │   │   │   ├── UptimeMonitors.tsx
│   │   │   │   ├── CICDStatus.tsx
│   │   │   │   └── SecurityPosture.tsx
│   │   │   ├── needs/
│   │   │   │   ├── NeedsList.tsx
│   │   │   │   └── NeedItem.tsx
│   │   │   ├── tokens/
│   │   │   │   ├── BudgetDashboard.tsx
│   │   │   │   ├── ModelBreakdown.tsx
│   │   │   │   ├── ModelPerformance.tsx
│   │   │   │   ├── DailySpendChart.tsx
│   │   │   │   └── LocalVsApiSplit.tsx
│   │   │   ├── agents/
│   │   │   │   ├── AgentRoster.tsx
│   │   │   │   ├── AgentCard.tsx
│   │   │   │   ├── SubagentTree.tsx
│   │   │   │   └── MCPStatus.tsx
│   │   │   ├── documents/
│   │   │   │   ├── FileTree.tsx
│   │   │   │   ├── MarkdownViewer.tsx
│   │   │   │   └── SearchBar.tsx
│   │   │   └── settings/
│   │   │       ├── APIKeyStatus.tsx
│   │   │       ├── MCPConfig.tsx
│   │   │       ├── FrameworkVersion.tsx
│   │   │       └── TailscaleStatus.tsx
│   │   └── pages/
│   │       ├── OverviewPage.tsx
│   │       ├── ProjectsPage.tsx
│   │       ├── KanbanPage.tsx
│   │       ├── HealthPage.tsx
│   │       ├── NeedsPage.tsx
│   │       ├── TokensPage.tsx
│   │       ├── AgentsPage.tsx
│   │       ├── DocumentsPage.tsx
│   │       └── SettingsPage.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
└── package.json
```

## Design Direction

### Aesthetic
Dark-mode-first observability dashboard. Inspired by Maple.dev's clean dark UI but with an industrial DevOps character. Think mission control, not SaaS admin panel.

### Design Tokens
- **Background:** Near-black (`#0a0a0f`) with subtle noise texture
- **Surfaces:** Dark gray cards (`#111118`) with 1px borders (`#1e1e2e`)
- **Accent primary:** Electric teal/cyan (`#06b6d4` range) — for healthy/active states
- **Accent warning:** Amber (`#f59e0b`) — for attention items
- **Accent danger:** Rose/red (`#f43f5e`) — for critical/failing states
- **Accent success:** Emerald (`#10b981`) — for passing/healthy
- **Text primary:** `#e4e4e7`
- **Text muted:** `#71717a`
- **Font:** `"JetBrains Mono"` for data/metrics, `"Plus Jakarta Sans"` for UI text — load from Google Fonts
- **Border radius:** Minimal (4-6px) — sharp, not bubbly
- **Spacing:** Generous but efficient — data-dense without feeling cramped

### Layout
- **Sidebar:** Narrow (64px collapsed, 240px expanded), dark, icon + label nav
- **Top bar:** Persistent 48px strip showing system uptime lights, token budget mini-bar, needs count badge, and active sessions
- **Content area:** Responsive grid, typically 12-column, with cards as primary containers
- **All pages scroll vertically** — no horizontal scroll, no tabs hiding critical data

---

## Mock Data Specification

Create a single `mock-data.ts` file with all mock data. This data should be realistic to the aidevops ecosystem. Use these specifics:

### System / Infrastructure
```typescript
export const systemMock = {
  vps: {
    hostname: "vps-01",
    ip: "65.108.xxx.xxx",
    provider: "VPS Provider",
    os: "Ubuntu 24.04",
    status: "healthy",
    uptime: "41d 7h 23m",
    cpu: { current: 23, history: [18, 22, 19, 31, 23, 25, 20, 23] },
    ram: { used: 3.9, total: 8, pct: 61 },
    disk: { used: 44, total: 100, pct: 44 },
    sshLatency: 42, // ms
    lastSSH: "2026-02-24T09:14:00Z",
    services: [
      { name: "nginx", status: "running" },
      { name: "node (app)", status: "running" },
      { name: "certbot", status: "idle" },
      { name: "fail2ban", status: "running" },
    ]
  },
  local: {
    hostname: "mac-mini-m4pro",
    chip: "Apple M4 Pro",
    memory: { used: 46.1, total: 64, pct: 72, pressure: "nominal" },
    cpu: { efficiency: 8, performance: 42, combined: 14 },
    gpu: { utilization: 31, metalActive: true },
    disk: { used: 380, total: 1000, pct: 38 },
    uptime: "12d 3h 51m",
    status: "healthy"
  },
  tailscale: {
    status: "connected",
    nodes: [
      { name: "mac-mini-m4pro", online: true, lastSeen: "now", ip: "100.x.x.1" },
      { name: "vps-01", online: true, lastSeen: "now", ip: "100.x.x.2" },
      { name: "iphone", online: true, lastSeen: "2m ago", ip: "100.x.x.3" },
      { name: "macbook", online: false, lastSeen: "3d ago", ip: "100.x.x.4" },
    ]
  }
};
```

### Ollama
```typescript
export const ollamaMock = {
  status: "running",
  loaded: [
    { name: "qwen2.5-coder:32b", size: "18.5 GB", quant: "Q4_K_M", vram: 19.2 },
    { name: "llama3.3:70b", size: "39.6 GB", quant: "Q4_K_M", vram: 41.0 },
  ],
  available: [
    "qwen2.5-coder:32b", "llama3.3:70b", "deepseek-r1:32b",
    "nomic-embed-text", "codellama:34b", "mistral:7b", "phi-3:14b"
  ],
  inference: { queue: 0, avgLatency: 890, tokensPerSec: 42.8 },
  memoryTotal: 64,
  memoryUsed: 60.2
};
```

### Token Budget & Model Performance
```typescript
export const tokensMock = {
  budget: {
    monthlyCap: 400, // dollars
    currentMonth: 284.50,
    projectedMonth: 362, // based on burn rate
    today: 12.84,
    thisWeek: 64.20,
    dailyHistory: [8.2, 11.4, 9.7, 14.2, 12.1, 10.8, 13.5, 12.8, 9.1, 15.3, 11.6, 12.9, 10.4, 12.84],
  },
  byModel: [
    { model: "Opus 4.5", tokens: 7736400, cost: 119.50, pct: 42, requests: 312, inputTokens: 5200000, outputTokens: 2536400 },
    { model: "Sonnet 4.5", tokens: 6447000, cost: 96.70, pct: 35, requests: 891, inputTokens: 4100000, outputTokens: 2347000 },
    { model: "Haiku 4.5", tokens: 1473600, cost: 7.40, pct: 8, requests: 2240, inputTokens: 980000, outputTokens: 493600 },
    { model: "Local (Ollama)", tokens: 2763000, cost: 0, pct: 15, requests: 445, inputTokens: 1800000, outputTokens: 963000 },
  ],
  modelPerformance: [
    { model: "Opus 4.5", success: 98.7, avgLatency: 2840, p95: 4200, p99: 6100, retries: 3, timeouts: 1, rateLimits: 0 },
    { model: "Sonnet 4.5", success: 99.2, avgLatency: 1420, p95: 2100, p99: 3400, retries: 1, timeouts: 0, rateLimits: 0 },
    { model: "Haiku 4.5", success: 99.8, avgLatency: 380, p95: 620, p99: 940, retries: 0, timeouts: 0, rateLimits: 0 },
    { model: "qwen2.5-coder:32b", success: 100, avgLatency: 890, p95: 1400, p99: 2100, retries: 0, timeouts: 0, rateLimits: 0 },
    { model: "llama3.3:70b", success: 99.1, avgLatency: 1650, p95: 2800, p99: 4200, retries: 2, timeouts: 1, rateLimits: 0 },
  ],
  localVsApi: { local: 15, api: 85 }
};
```

### Needs From Me
```typescript
export const needsMock = [
  { id: 1, type: "review", priority: "critical", title: "PR #47: App export optimization", source: "GitHub", age: "2h", project: "acme-app", impact: "Blocks next deploy" },
  { id: 2, type: "approval", priority: "high", title: "Deploy storefront theme v2.8.1 to production", source: "CI/CD", age: "45m", project: "acme-store", impact: "Staging verified, waiting on go" },
  { id: 3, type: "security", priority: "critical", title: "2 HIGH vulnerabilities in node_modules", source: "Snyk", age: "1d", project: "acme-app", impact: "Exposed in production" },
  { id: 4, type: "expiring", priority: "medium", title: "SSL cert for create.example.com — 12 days", source: "Cert Monitor", age: "—", project: "infrastructure", impact: "Site goes insecure" },
  { id: 5, type: "failure", priority: "high", title: "E2E tests failing on main branch", source: "GitHub Actions", age: "3h", project: "acme-app", impact: "Merges blocked" },
  { id: 6, type: "agent", priority: "medium", title: "@seo agent needs strategy decision on keyword cannibalization", source: "Matrix/#seo-ops", age: "6h", project: "acme-web", impact: "SEO work paused" },
  { id: 7, type: "overdue", priority: "low", title: "CRM custom view cleanup — 3 days overdue", source: "TODO.md", age: "3d", project: "acme-crm", impact: "Technical debt" },
];
```

### Projects
```typescript
export const projectsMock = [
  {
    name: "acme-app",
    description: "Interactive Label Design Studio — React/TS + Fabric.js + Three.js",
    repo: "github.com/youruser/acme-app",
    platform: "github",
    branch: "main",
    lastCommit: { sha: "a3f8c21", message: "fix: export resolution on retina displays", author: "opus-4.5", time: "2h ago" },
    ci: "failing",
    quality: "A",
    issues: 4,
    prs: 2,
    vulns: { critical: 0, high: 2, medium: 5 },
    language: "TypeScript",
    category: "Custom Water",
    tokenSpend: 89.20,
    lastDeploy: "2026-02-22T14:30:00Z"
  },
  {
    name: "acme-store",
    description: "E-commerce storefront — custom pricing, invoice payments",
    repo: "github.com/youruser/acme-store",
    platform: "github",
    branch: "main",
    lastCommit: { sha: "e7b2d94", message: "feat: add name-your-price invoice flow", author: "opus-4.5", time: "1d ago" },
    ci: "passing",
    quality: "A-",
    issues: 1,
    prs: 1,
    vulns: { critical: 0, high: 0, medium: 2 },
    language: "Liquid",
    category: "Custom Water",
    tokenSpend: 42.10,
    lastDeploy: "2026-02-23T09:15:00Z"
  },
  {
    name: "acme-web",
    description: "Marketing site — SEO optimized, lead capture integration",
    repo: "github.com/youruser/acme-web",
    platform: "github",
    branch: "main",
    lastCommit: { sha: "1c9f0ab", message: "seo: restructure H1 tags to resolve cannibalization", author: "sonnet-4.5", time: "6h ago" },
    ci: "passing",
    quality: "B+",
    issues: 3,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 0 },
    language: "HTML/CSS",
    category: "Custom Water",
    tokenSpend: 31.40,
    lastDeploy: "2026-02-24T03:00:00Z"
  },
  {
    name: "aidevops-dashboard",
    description: "This dashboard — Command Center plugin for aidevops",
    repo: "github.com/youruser/aidevops-dashboard",
    platform: "github",
    branch: "main",
    lastCommit: { sha: "0000000", message: "initial: phase 1 scaffold", author: "opus-4.6", time: "just now" },
    ci: "none",
    quality: "—",
    issues: 0,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 0 },
    language: "TypeScript",
    category: "Infrastructure",
    tokenSpend: 0,
    lastDeploy: null
  },
  {
    name: "my-infra",
    description: "Infrastructure configs — Tailscale, Ollama, server provisioning",
    repo: "github.com/youruser/my-infra",
    platform: "github",
    branch: "main",
    lastCommit: { sha: "f42a891", message: "chore: update ollama model list", author: "j", time: "3d ago" },
    ci: "passing",
    quality: "B",
    issues: 0,
    prs: 0,
    vulns: { critical: 0, high: 0, medium: 1 },
    language: "Shell",
    category: "Infrastructure",
    tokenSpend: 15.80,
    lastDeploy: null
  }
];
```

### Kanban Tasks
```typescript
export const kanbanMock = {
  backlog: [
    { id: "t-010", title: "Add webhook for lead scoring updates", project: "acme-crm", priority: "low", agent: null, estimate: "~2h" },
    { id: "t-011", title: "Implement dark mode for app", project: "acme-app", priority: "medium", agent: null, estimate: "~6h" },
    { id: "t-012", title: "Research Reddit communities for Q2 promo push", project: "acme-web", priority: "low", agent: null, estimate: "~3h" },
    { id: "t-013", title: "Evaluate Cloudflare Workers for edge caching", project: "infrastructure", priority: "medium", agent: null, estimate: "~4h" },
  ],
  planned: [
    { id: "t-007", title: "Build CRM forms → email sequence bridge", project: "acme-crm", priority: "high", agent: "@code", estimate: "~8h", plan: "3-step integration via webhook" },
    { id: "t-008", title: "Implement GA4 enhanced ecommerce tracking", project: "acme-store", priority: "medium", agent: "@seo", estimate: "~4h", plan: "Use GTM dataLayer push" },
  ],
  inProgress: [
    { id: "t-003", title: "Fix App export resolution on retina displays", project: "acme-app", priority: "high", agent: "@code", estimate: "~4h", started: "2026-02-24T07:00:00Z", elapsed: "5h" },
    { id: "t-004", title: "Resolve keyword cannibalization: homepage vs /products", project: "acme-web", priority: "high", agent: "@seo", estimate: "~6h", started: "2026-02-24T03:00:00Z", elapsed: "9h" },
    { id: "t-005", title: "aidevops-dashboard Phase 1 mockup", project: "aidevops-dashboard", priority: "high", agent: "@code", estimate: "~16h", started: "2026-02-24T10:00:00Z", elapsed: "2h" },
  ],
  pendingApproval: [
    { id: "t-001", title: "PR #47: App export optimization", project: "acme-app", priority: "critical", agent: "@code", waiting: "2h", requires: "Code review + merge" },
    { id: "t-002", title: "Deploy storefront theme v2.8.1", project: "acme-store", priority: "high", agent: "@deploy", waiting: "45m", requires: "Production deploy approval" },
  ],
  recentlyCompleted: [
    { id: "t-020", title: "Add quantity restriction metafields to store", project: "acme-store", completed: "2026-02-23T16:00:00Z", agent: "@code", elapsed: "3h" },
    { id: "t-021", title: "Create custom CRM views for app leads", project: "acme-crm", completed: "2026-02-23T11:00:00Z", agent: "@code", elapsed: "2h" },
    { id: "t-022", title: "Fix baseboard heater rattle — order replacement part", project: "personal", completed: "2026-02-22T19:00:00Z", agent: null, elapsed: "1h" },
    { id: "t-023", title: "Update Ollama models to latest quantizations", project: "infrastructure", completed: "2026-02-22T14:00:00Z", agent: "@code", elapsed: "30m" },
    { id: "t-024", title: "SEO audit: Map all H1/H2 tags across example.com", project: "acme-web", completed: "2026-02-21T22:00:00Z", agent: "@seo", elapsed: "4h" },
  ]
};
```

### Agents
```typescript
export const agentsMock = {
  primary: [
    { name: "@code", desc: "Primary coding agent", status: "active", lastUsed: "2m ago", subagents: 142, mcps: ["github", "filesystem", "code-quality"] },
    { name: "@seo", desc: "SEO analysis and optimization", status: "active", lastUsed: "6h ago", subagents: 48, mcps: ["search-console", "ahrefs", "dataforseo"] },
    { name: "@deploy", desc: "Deployment and CI/CD", status: "idle", lastUsed: "1d ago", subagents: 35, mcps: ["github-actions", "vps-api", "vps-api"] },
    { name: "@wordpress", desc: "WordPress management", status: "idle", lastUsed: "3d ago", subagents: 67, mcps: ["mainwp", "localwp", "wp-rest"] },
    { name: "@browser", desc: "Browser automation", status: "idle", lastUsed: "2d ago", subagents: 28, mcps: ["playwright", "crawl4ai", "stagehand"] },
    { name: "@code-quality", desc: "Code quality enforcement", status: "idle", lastUsed: "1d ago", subagents: 52, mcps: ["sonarcloud", "codacy", "codefactor"] },
    { name: "@vps-a", desc: "VPS provider A management", status: "idle", lastUsed: "5d ago", subagents: 31, mcps: ["vps-api", "ssh"] },
    { name: "@vps-b", desc: "VPS provider B management", status: "idle", lastUsed: "2d ago", subagents: 24, mcps: ["vps-api", "ssh"] },
    { name: "@git", desc: "Git platform operations", status: "idle", lastUsed: "4h ago", subagents: 41, mcps: ["github", "gitlab", "gitea"] },
    { name: "@agent-review", desc: "Session review and agent improvement", status: "idle", lastUsed: "1d ago", subagents: 18, mcps: [] },
    { name: "@document", desc: "Document creation and conversion", status: "idle", lastUsed: "2d ago", subagents: 22, mcps: ["pandoc"] },
  ],
  mcpServers: [
    { name: "github", status: "connected", loading: "eager", lastPing: "12s ago" },
    { name: "filesystem", status: "connected", loading: "eager", lastPing: "8s ago" },
    { name: "ollama", status: "connected", loading: "eager", lastPing: "5s ago" },
    { name: "search-console", status: "connected", loading: "on-demand", lastPing: "6h ago" },
    { name: "sonarcloud", status: "disconnected", loading: "on-demand", lastPing: "1d ago" },
    { name: "vps-api", status: "connected", loading: "on-demand", lastPing: "5d ago" },
    { name: "vps-api", status: "connected", loading: "on-demand", lastPing: "2d ago" },
    { name: "playwright", status: "stopped", loading: "on-demand", lastPing: "2d ago" },
    { name: "crawl4ai", status: "stopped", loading: "on-demand", lastPing: "3d ago" },
    { name: "pandoc", status: "connected", loading: "eager", lastPing: "30s ago" },
  ],
  skillScans: {
    lastScan: "2026-02-23T08:00:00Z",
    totalSkills: 47,
    blocked: 0,
    warnings: 3,
  }
};
```

### Documents / Workspace
```typescript
export const documentsMock = {
  tree: [
    { type: "dir", name: ".agent-workspace", children: [
      { type: "dir", name: "work", children: [
        { type: "dir", name: "wordpress", children: [] },
        { type: "dir", name: "hosting", children: [] },
        { type: "dir", name: "seo", children: [
          { type: "file", name: "cannibalization-audit.md", size: "4.2 KB", modified: "6h ago" },
          { type: "file", name: "keyword-map.md", size: "8.1 KB", modified: "1d ago" },
        ]},
        { type: "dir", name: "development", children: [
          { type: "file", name: "app-architecture.md", size: "12.4 KB", modified: "3d ago" },
        ]},
      ]},
      { type: "dir", name: "memory", children: [
        { type: "file", name: "session-2026-02-24.md", size: "6.8 KB", modified: "2h ago" },
        { type: "file", name: "session-2026-02-23.md", size: "14.2 KB", modified: "1d ago" },
      ]},
      { type: "dir", name: "tmp", children: [] },
    ]},
    { type: "file", name: "AGENTS.md", size: "28.4 KB", modified: "2d ago" },
    { type: "file", name: "TODO.md", size: "5.6 KB", modified: "2h ago" },
    { type: "file", name: "PLANS.md", size: "3.1 KB", modified: "1d ago" },
  ]
};
```

### Settings
```typescript
export const settingsMock = {
  framework: { version: "2.15.2", latest: "2.15.2", updateAvailable: false },
  apiKeys: [
    { service: "Anthropic", configured: true, lastRotated: "2026-01-15", status: "valid" },
    { service: "GitHub", configured: true, lastRotated: "2026-02-01", status: "valid" },
    { service: "Ahrefs", configured: true, lastRotated: "2025-12-20", status: "valid" },
    { service: "DataForSEO", configured: true, lastRotated: "2025-11-10", status: "expiring" },
    { service: "updown.io", configured: true, lastRotated: "2026-01-01", status: "valid" },
    { service: "SonarCloud", configured: false, lastRotated: null, status: "missing" },
    { service: "VirusTotal", configured: true, lastRotated: "2025-12-01", status: "valid" },
  ],
  models: {
    primary: "claude-opus-4-6",
    fallback: "claude-sonnet-4-5-20250929",
    local: "qwen2.5-coder:32b"
  }
};
```

### Uptime Monitors
```typescript
export const uptimeMock = [
  { name: "example.com", url: "https://example.com", status: "up", uptime7d: 99.98, uptime30d: 99.94, responseTime: 342, history: [320, 335, 410, 342] },
  { name: "create.example.com", url: "https://create.example.com", status: "up", uptime7d: 99.87, uptime30d: 99.82, responseTime: 580, history: [610, 560, 595, 580] },
  { name: "VPS API", url: "https://api.example.com", status: "up", uptime7d: 100, uptime30d: 99.99, responseTime: 89, history: [92, 85, 94, 89] },
];
```

---

## Page Specifications

### 1. Overview Page (Default Landing)

This is the command center home screen. Everything at a glance.

**Top Section — Status Strip (always visible in TopBar):**
- 3 system health dots (VPS, Local, Tailscale) — green/yellow/red
- Ollama: "2 models loaded • 42.8 t/s" 
- Token budget mini progress bar: "$284 / $400" with projected end marker
- "Needs From Me" badge: red circle with count (7)
- Active sessions indicator: "2 active"

**Main Content Grid:**

Row 1 (4 equal cards):
- **Commits Today**: "14" with sparkline of last 7 days
- **Active Agent Sessions**: "2" with names (@code, @seo)
- **Open PRs**: "3 across 2 repos"
- **Open Issues**: "8 across 4 repos"

Row 2 (2 cards, 60/40 split):
- **Needs From Me** (60%): Top 5 items from needs list, sorted by priority. Each shows priority dot, title, source badge, age. "View all →" link to full Needs page
- **Recent Activity** (40%): Last 8 events timeline — agent actions, commits, deploys, CI results. Each with timestamp, icon, one-line description

Row 3 (3 equal cards):
- **Resource Usage**: VPS + Local mini gauges (CPU, RAM, Disk) side by side
- **Token Spend Today**: "$12.84" with model breakdown mini-bar and comparison to daily average
- **Model Health**: 5 models listed with success rate % and tiny latency indicator

### 2. Projects Page

**Controls:** Category filter pills, sort dropdown (last activity, quality, issues), grid/list toggle

**Grid of ProjectCards:**
Each card shows:
- Project name + description
- Platform icon (GitHub logo) + branch name
- Last commit: SHA, message (truncated), author, time ago
- CI badge (passing green / failing red / none gray)
- Code quality letter grade with color
- Stat row: issues | PRs | vulns
- Language tag
- Token spend this month
- Category tag (color-coded)

Click a card → expands to ProjectDetail inline (or modal) with recent commits, branches, vulnerability details, associated tasks

### 3. Kanban Page

**5 columns** with counts in headers:
- Backlog (4) | Planned (2) | In Progress (3) | Pending Approval (2) | Completed (5)

**Pending Approval column** has a highlighted border (amber/teal glow) to draw attention

**Task cards show:**
- Priority dot (color)
- Title
- Project tag (small badge)
- Assigned agent (or "Manual")
- Time: estimate for backlog/planned, elapsed for in-progress, waiting time for pending approval, total time for completed
- If dependencies exist: small chain-link icon

**Filter bar:** Filter by project, priority, agent

**Drag-and-drop** between columns (visual only in Phase 1 — no persistence)

### 4. Health Page

**Grid layout, 2 columns:**

Left column:
- **VPS Server Card**: hostname, IP, provider, uptime, 4 metric rows (CPU, RAM, Disk, SSH latency) each with value + mini sparkline, services list with status dots
- **Uptime Monitors Card**: List of monitored URLs with status dot, uptime %, response time, sparkline

Right column:
- **Local Machine Card**: hostname, chip, uptime, memory (with pressure indicator), CPU breakdown (efficiency/performance), GPU, disk
- **Ollama Card**: loaded models (name, size, quant, VRAM), available models list, inference stats (queue, latency, t/s), memory allocation bar

Bottom full-width:
- **Network & Connectivity**: Tailscale node list with online/offline and last seen
- **CI/CD Pipelines**: Per-repo workflow status, last run, pass/fail, duration
- **Security Posture**: gopass status, secrets rotation summary, Snyk aggregate, skill scan results

### 5. Needs From Me Page

**Grouped sections** with collapsible headers and counts:
- 🔴 Critical (2)
- 🟡 High (2)
- 🔵 Medium (2)
- ⚪ Low (1)

**Each NeedItem shows:**
- Priority dot
- Type icon (review, approval, security, expiring, failure, agent, overdue)
- Title
- Source badge
- Project badge
- Age (time waiting)
- Impact statement (what happens if ignored)
- Action buttons: Approve | Review | Dismiss | Snooze (visual only in Phase 1)

### 6. Tokens & Cost Page

**Top row — 4 metric cards:**
- Today's Spend: $12.84 (↑8% vs avg)
- This Week: $64.20
- This Month: $284.50 / $400 budget
- Projected Month-End: $362 (safe / within budget)

**Middle section — 2 charts side by side:**
- **Daily Spend** (bar chart, 14 days) with budget daily average line
- **Model Breakdown** (donut chart) with legend showing model, %, cost

**Bottom section — 2 panels:**
- **Model Performance Table**: model | requests | success % | avg latency | p95 | p99 | retries | timeouts — sortable columns
- **Local vs API Split**: horizontal stacked bar showing 15% local / 85% API with token counts

### 7. Agents Page

**Agent Roster** — list/grid of primary agents:
Each agent card: name, description, status dot (active/idle), last used time, subagent count, connected MCPs listed as tiny badges

Click to expand → subagent tree (collapsible nested list)

**MCP Server Status** — table:
name | status (connected/disconnected/stopped) | loading strategy (eager/on-demand) | last ping

**Skill Security** — summary card:
Total skills, last scan date, blocked count, warning count

### 8. Documents Page

**Split layout:**
- Left panel (30%): File tree navigator with expand/collapse directories
- Right panel (70%): Markdown content viewer (rendered HTML from markdown)

Click a file in the tree → renders in the viewer

Search bar at top of file tree for filtering

### 9. Settings Page

**Sections:**

**Framework:**
- Version: 2.15.2 (✓ up to date)
- Repository path: ~/Git/aidevops
- Agents directory: ~/.aidevops/agents

**API Keys:**
- Table: service | configured (✓/✗) | status (valid/expiring/missing) | last rotated
- Color coding: green for valid, amber for expiring, red for missing

**AI Models:**
- Primary: claude-opus-4-6
- Fallback: claude-sonnet-4-5
- Local: qwen2.5-coder:32b

**Tailscale:**
- Network status
- Connected nodes list

---

## Implementation Notes

1. **All data comes from mock-data.ts** — no API calls, no fetch, no backend. Everything is imported directly.

2. **Use client-side routing** — TanStack Router or simple React state-based page switching. URL should update (e.g., `/projects`, `/kanban`, `/health`).

3. **Animations** — Use CSS transitions for card hovers, page transitions, and gauge animations on load. Sparklines should animate in. Kanban drag should have smooth visual feedback.

4. **Responsive** — Must work down to 1024px width. Below that, sidebar collapses to icons only. Cards stack to single column on narrow viewports.

5. **No authentication in Phase 1** — it's a local prototype.

6. **Dark mode only** — no light mode toggle needed yet.

7. **The TopBar status strip persists across all pages** — it's the constant situational awareness layer.

8. **Cmd+K command palette** — opens a search dialog that can fuzzy-match page names, project names, agent names, and task titles for quick navigation.

---

## Definition of Done

Phase 1 is complete when:
- [ ] All 9 pages render with mock data
- [ ] Sidebar navigation works between all pages
- [ ] TopBar shows live-looking status across all pages
- [ ] Kanban board has visual drag-and-drop
- [ ] All charts render (sparklines, bar charts, donut charts, gauges)
- [ ] Cmd+K command palette opens and filters
- [ ] Responsive down to 1024px
- [ ] Dark theme is polished and consistent
- [ ] No console errors
- [ ] `bun run dev` starts clean and loads in < 2 seconds
