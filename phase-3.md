# Phase 3 — Intelligence & Integrations

## Goal

Connect remaining external services, build a robust "Needs From Me" aggregation engine, add token/cost analytics with budget alerts and burn rate projections, and integrate code quality, CI/CD, SSL, and PageSpeed monitoring.

## What Already Exists (from Phase 2)

- **Needs aggregator** (`server/routes/needs.ts`): Basic version pulling from cached tasks, projects, health, VPS, Ollama. Needs expansion.
- **Token collector** (`server/collectors/token-collector.ts`): JSONL scanning with dedup, cost by model/project. Needs budget alerts, burn rate, monthly cap.
- **Git collector** (`server/collectors/git-collector.ts`): GitHub repos, commits, PRs, CI status. Needs deeper Actions integration.
- **Uptime collector** (`server/collectors/uptime-collector.ts`): updown.io basic checks. Needs 7d uptime metrics.

## Sessions

### Session A — Enhanced Needs Engine + Alert System

**New need sources to add:**
1. **Overdue tasks** — Tasks in TODO.md with `started:` date > 7 days ago still in progress
2. **Token budget alerts** — When daily/weekly/monthly spend exceeds configurable thresholds
3. **SSL certificate expiry** — Check cert expiry for monitored domains (from uptime monitors)
4. **Stale branches** — GitHub branches with no commits in 30+ days
5. **Dependabot/security alerts** — GitHub security advisories API

**Alert threshold system:**
- Config-driven thresholds in `server/config.ts`
- Thresholds: `tokenBudget.dailyWarn`, `tokenBudget.monthlyWarn`, `tokenBudget.monthlyCap`
- Thresholds: `health.cpuWarn`, `health.ramWarn`, `health.diskWarn`
- Thresholds: `ssl.expiryWarnDays`
- Alerts feed into Needs aggregator with appropriate priority

**Files to create/modify:**
- `server/collectors/ssl-collector.ts` — TLS cert expiry checker
- `server/routes/needs.ts` — Expand with new sources
- `server/config.ts` — Add threshold config
- `server/routes/alerts.ts` — GET /api/alerts (threshold status)

### Session B — Token Analytics & Budget Management

**Enhancements to token collector:**
1. **Monthly budget cap** — Configurable via `DASHBOARD_TOKEN_BUDGET` env var (default $400)
2. **Burn rate projection** — Linear projection from current month spend to month-end
3. **Budget alerts** — Warn at 75%, alert at 90%, critical at 100%
4. **Per-session cost** — Group JSONL entries by session (file path = session)
5. **Cost trend** — 30-day rolling average, week-over-week comparison

**New API endpoints:**
- `GET /api/tokens/budget` — Budget status with projection and alerts
- `GET /api/tokens/sessions` — Per-session cost breakdown (last 7 days)

**Frontend updates:**
- BudgetDashboard: Add budget cap, projection bar, alert indicator
- DailySpendChart: Add budget line, projection dotted line
- New: BurnRateCard showing projected month-end spend

### Session C — External Service Integrations

**New collectors:**
1. **GitHub Actions** (`server/collectors/actions-collector.ts`)
   - Workflow run history (last 10 per repo)
   - Failure rate, avg duration
   - Currently running workflows
   - Feed failures into Needs

2. **SSL Certificate Monitor** (`server/collectors/ssl-collector.ts`)
   - Check TLS cert expiry for domains from uptime monitors
   - Feed expiring certs (< 14 days) into Needs

3. **PageSpeed / Lighthouse** (`server/collectors/pagespeed-collector.ts`)
   - Google PageSpeed Insights API (free, no key needed for basic)
   - Performance, Accessibility, Best Practices, SEO scores
   - Run on-demand or daily for monitored URLs

4. **updown.io enhancements** — Fetch `/api/checks/:token/metrics` for 7d uptime

**New API endpoints:**
- `GET /api/ci` — CI/CD pipeline status across all repos
- `GET /api/ssl` — SSL certificate status for monitored domains
- `GET /api/pagespeed?url=X` — PageSpeed scores (on-demand, cached 24h)

**Frontend updates:**
- HealthPage: Enhance CICDStatus with run history, failure rate
- HealthPage: Add SSL expiry panel
- New page or panel: PageSpeed scores

### Session D — Frontend Polish & Integration

**Wire all new endpoints into frontend:**
- Update NeedsBadge/NeedsList with new need types (ssl, budget, stale-branch)
- Update BudgetDashboard with cap/projection/alerts
- Add CI/CD run history to HealthPage
- Add SSL panel to HealthPage
- Add PageSpeed panel (optional, can be Settings or Health)
- Ensure all new data has loading/error/stale states

**Quality pass:**
- Verify all pages render correctly with real data
- Handle edge cases (no uptime key, no GitHub token, Ollama down)
- Test with backend restart (stale data handling)

## Endpoints Summary (New)

| Endpoint | Source | Session |
|---|---|---|
| `GET /api/alerts` | Threshold engine | A |
| `GET /api/tokens/budget` | Token collector + config | B |
| `GET /api/tokens/sessions` | JSONL scanner | B |
| `GET /api/ci` | GitHub Actions API | C |
| `GET /api/ssl` | TLS cert check | C |
| `GET /api/pagespeed?url=X` | PageSpeed Insights API | C |

## Config Additions

```ts
// Thresholds
tokenBudget: {
  monthlyCap: Number(process.env.DASHBOARD_TOKEN_BUDGET ?? 400),
  dailyWarn: Number(process.env.DASHBOARD_TOKEN_DAILY_WARN ?? 25),
  monthlyWarnPct: 75,  // % of cap
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
pagespeed: {
  enabled: process.env.ENABLE_PAGESPEED !== "false",
  urls: (process.env.PAGESPEED_URLS ?? "").split(",").filter(Boolean),
},
```

## Success Criteria

- [ ] Needs panel shows 5+ real need types from live sources
- [ ] Token budget shows cap, projection, and alerts
- [ ] CI/CD shows workflow run history with failure rates
- [ ] SSL expiry monitoring for all uptime-monitored domains
- [ ] PageSpeed scores available on-demand
- [ ] Alert thresholds configurable via env vars
- [ ] All new panels have loading/error states
