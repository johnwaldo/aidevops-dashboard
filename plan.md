# AiDevOps Command Center — Master Plan

## Project Summary

A browser-based operational dashboard plugin for the [aidevops](https://github.com/marcusquinn/aidevops) framework. Provides real-time visibility into projects, infrastructure health, AI agent activity, task management, token consumption, and human action queues. Scoped entirely to the user's own infrastructure, repos, and services.

**Repo:** `aidevops-dashboard` (standalone plugin, not merged into aidevops core)  
**Relationship to aidevops:** Reads from aidevops filesystem conventions (`~/.aidevops/`, `TODO.md`, `SKILL.md`, etc.) and CLI output. Registers as an aidevops plugin. Versions and deploys independently.  
**Deployment:** Local (Mac Mini M4 Pro) via `localhost:3000`, remote access via Tailscale mesh  
**Stack:** Bun.serve backend, React + Vite + Tailwind CSS + shadcn/ui frontend, WebSocket for real-time updates  
**Built by:** Claude Opus 4.6 via OpenCode terminal

---

## Phase Overview

### Phase 1 — Frontend Mockup & Foundation
**Goal:** Fully designed, interactive frontend with mock data. Every panel, layout, navigation, and component built and visually polished. No backend. No live data. Pure UI/UX.  
**Deliverable:** A React SPA you can open in the browser, click through every page, see realistic mock data in every widget, and validate the design before any backend work begins.  
**Timeline:** 2-3 days with Opus 4.6  
**Details:** See `phase-1.md`

### Phase 2 — Backend API & Data Layer
**Goal:** Bun.serve backend that collects real data from all sources and serves it via REST + WebSocket.  
**Deliverable:** API endpoints returning live data for every panel. Frontend switches from mock data to real API calls.  
**Key work:**
- TODO.md / PLANS.md parser (robust, handles Beads, time tracking, priorities)
- SKILL.md parser for agent metadata from `~/.aidevops/agents/`
- `aidevops status` CLI wrapper → JSON
- System metrics collectors (macOS local + VPS via SSH)
- Ollama API integration (`/api/tags`, `/api/ps`, inference metrics)
- Git platform API polling (GitHub/GitLab/Gitea — user's registered repos)
- Token usage tracking (Anthropic API usage, local Ollama inference logs)
- WebSocket layer for real-time metric push
- Filesystem watchers (fsevents) for TODO.md and workspace changes
**Timeline:** 1-2 weeks with Opus 4.6

### Phase 3 — Intelligence & Integrations
**Goal:** Connect remaining external services, build the aggregated "Needs From Me" engine, and add token/cost analytics with full model performance tracking.  
**Deliverable:** All Phase 1 panels showing live data. Needs From Me panel aggregating across all sources. Token budget with projections and alerts.  
**Key work:**
- "Needs From Me" aggregation engine (PRs, approvals, CI failures, security findings, expiring resources, overdue tasks)
- Token & cost analytics (Anthropic billing, per-model breakdown, burn rate projection, budget alerts)
- Model success rate tracking (completion/failure/retry per model, latency percentiles)
- Code quality API integration (CodeFactor, SonarCloud, Codacy, Snyk)
- updown.io API for uptime monitoring
- PageSpeed / Lighthouse integration
- CI/CD pipeline status (GitHub Actions API)
- SSL certificate expiry monitoring
- Alert threshold system (budget, health, security, staleness)
**Timeline:** 1-2 weeks with Opus 4.6

### Phase 4 — Matrix Communications Hub
**Goal:** Full Matrix channel integration with real-time message feeds.  
**Deliverable:** Matrix panel showing all rooms, per-channel activity feeds, agent output streams, unread indicators.  
**Key work:**
- Matrix Client-Server API integration (Conduit/Synapse)
- Auth token management and sync loop
- Room listing and categorization
- Message history and real-time sync
- Agent output stream filtering (agent messages vs human)
- Unread count tracking
**Timeline:** 1-2 weeks with Opus 4.6

### Phase 5 — Write-Back Actions & Polish
**Goal:** Enable targeted write-back actions from the dashboard. Production hardening.  
**Deliverable:** Ability to approve PRs, move kanban cards, trigger agents, toggle settings directly from the dashboard. Stable for daily use.  
**Key work:**
- Kanban drag-and-drop writes back to TODO.md
- PR approval/merge from dashboard
- Agent triggering (send commands to Matrix channels or invoke CLI)
- Settings modification (toggle MCPs, update configs)
- Auth layer for non-localhost access
- Error handling, retry logic, graceful degradation
- Performance optimization (lazy loading, virtualized lists)
- Memory leak testing (72+ hour stability)
**Timeline:** 1-2 weeks with Opus 4.6

### Phase 6 — Domain-Specific Panels
**Goal:** Add specialized panels for SEO, WordPress, and extended git/code quality views.  
**Deliverable:** Full-featured domain panels for power users.  
**Key work:**
- SEO panel (Google Search Console, Ahrefs, DataForSEO, keyword tracking)
- WordPress panel (MainWP, plugin/theme update status, site health)
- Git deep-dive (unified commit feed, branch management, PR review interface)
- Session replay (browse past agent session logs with timeline)
- Dashboard as aidevops agent (`@dashboard`) with self-update capability
- Notification system (desktop notifications, email digests)
**Timeline:** 2-3 weeks with Opus 4.6

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                      │
│  Tailwind CSS + shadcn/ui + Recharts + TanStack Table   │
│  Pages: Overview | Projects | Kanban | Health | Needs    │
│         Tokens | Agents | Documents | Matrix | Settings  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────┴──────────────────────────────────┐
│                  Bun.serve Backend                        │
│                                                          │
│  Parsers:     TODO.md | PLANS.md | SKILL.md | status    │
│  Collectors:  System metrics | Ollama | Git APIs         │
│               Token usage | updown.io | PageSpeed        │
│  Watchers:    Filesystem (fsevents) for real-time        │
│  Proxy:       Matrix Client-Server API                   │
│  WebSocket:   Real-time push to frontend                 │
└──────────────────────┬──────────────────────────────────┘
                       │ Reads from
┌──────────────────────┴──────────────────────────────────┐
│              Data Sources                                │
│                                                          │
│  Local:    ~/.aidevops/ | TODO.md | ~/Git/*              │
│  APIs:     GitHub | Ollama | Anthropic | updown.io       │
│  CLI:      aidevops status | aidevops repos              │
│  SSH:      VPS metrics (Hostinger/Hetzner)               │
│  Matrix:   Conduit/Synapse Client-Server API             │
└─────────────────────────────────────────────────────────┘
```

## Key Principles

1. **Plugin, not monolith** — Separate repo, separate versioning, reads from aidevops conventions
2. **Read-only until Phase 5** — Dashboard observes but doesn't modify until write-back is explicitly built and tested
3. **Filesystem-first** — No database. aidevops stores state in markdown and filesystem; the dashboard reads it directly
4. **Mock-first development** — Phase 1 is entirely mock data. Each subsequent phase replaces mock with real, one panel at a time
5. **Local-first** — Runs on localhost, Tailscale for remote. No public internet exposure unless explicitly configured
6. **AI-built** — Every line written by Opus 4.6 via OpenCode. Human reviews and approves.
