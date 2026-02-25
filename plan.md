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
**Timeline:** 2-4 hours in a single Claude Code session  
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
- Token usage tracking (JSONL log scanning — approach adapted from [CodexBar](https://github.com/steipete/CodexBar) and [tokscale](https://github.com/junhoyeo/tokscale). Scans `~/.claude/projects/**/*.jsonl` for per-model token counts and calculates cost)
- WebSocket layer for real-time metric push
- Filesystem watchers (fsevents) for TODO.md and workspace changes
**Timeline:** 2-3 sessions (6-10 hours total) with Opus 4.6  
**Details:** See `phase-2.md`

### Phase 3 — Intelligence & Integrations
**Goal:** Connect remaining external services, build the aggregated "Needs From Me" engine, and add token/cost analytics with full model performance tracking.  
**Deliverable:** All Phase 1 panels showing live data. Needs From Me panel aggregating across all sources. Token budget with projections and alerts.  
**Key work:**
- "Needs From Me" aggregation engine (PRs, approvals, CI failures, security findings, expiring resources, overdue tasks)
- Token & cost analytics dashboard refinements (budget alerts, burn rate projection, per-project attribution from JSONL file paths)
- Model success rate tracking (completion/failure/retry per model, latency percentiles)
- Code quality API integration (CodeFactor, SonarCloud, Codacy, Snyk)
- updown.io API for uptime monitoring
- PageSpeed / Lighthouse integration
- CI/CD pipeline status (GitHub Actions API)
- SSL certificate expiry monitoring
- Alert threshold system (budget, health, security, staleness)
**Timeline:** 2-3 sessions (6-10 hours total) with Opus 4.6  
**Details:** See `phase-3.md`

### Phase 4 — Remote Access, Auth & Multi-Device
**Goal:** Make the dashboard accessible from any device on the Tailscale mesh with proper authentication. Production-grade access layer so you can check the command center from your phone, laptop, or any machine.  
**Deliverable:** Dashboard accessible via Tailscale from any device, authenticated, responsive on mobile, with stability hardening for daily unattended use.  
**Key work:**
- Tailscale Serve / Funnel configuration for HTTPS access
- Authentication layer (Tailscale identity + bearer token fallback)
- Localhost bypass for local development
- Rate limiting on all endpoints
- Mobile-responsive polish (touch-friendly, compact layouts)
- WebSocket reconnection with exponential backoff
- Startup resilience (collectors fail independently)
- Memory management (bounded caches, cleanup intervals)
- Structured logging with rotation
- Diagnostics endpoint for health monitoring
- Stability testing (72+ hour unattended run)
**Timeline:** 1-2 sessions (4-6 hours total) with Opus 4.6  
**Details:** See `phase-4.md`

### Phase 5 — Write Operations
**Goal:** Enable write-back actions from the dashboard — task creation, config editing, PR management, and agent dispatch. The dashboard becomes an operational tool, not just a display.  
**Deliverable:** Ability to create/move tasks, approve/merge PRs, trigger agents, and edit settings directly from the dashboard. All actions confirmed, audited, and reversible where possible.  
**Key work:**
- Kanban drag-and-drop writes back to TODO.md (atomic writes, backups, rollback)
- Task creation from dashboard
- PR approval/merge via GitHub API
- CI workflow re-trigger for failed pipelines
- Agent dispatch (invoke agents via CLI or command channels)
- Settings modification (budget cap, alert thresholds)
- Confirmation dialogs on all write actions
- Optimistic UI updates with rollback on failure
- Audit trail (append-only JSONL log of all actions)
- Needs From Me quick actions (approve, dismiss, snooze wired to real backends)
**Timeline:** 2-3 sessions (6-10 hours total) with Opus 4.6  
**Details:** See `phase-5.md`

### Phase 6 — Matrix & Domain-Specific Panels
**Goal:** Add Matrix communications hub and specialized panels for SEO, WordPress, and extended git views.  
**Deliverable:** Full Matrix channel integration plus domain-specific operational panels.  
**Key work:**
- Matrix Client-Server API integration (Conduit/Synapse)
- Room listing, categorization, message feeds, agent output filtering
- Unread tracking and read receipts
- Agent message detection → needs engine integration
- SEO panel (Google Search Console, Ahrefs, DataForSEO, keyword tracking)
- WordPress panel (MainWP, plugin/theme update status, site health)
- Git deep-dive (unified commit feed, branch management, PR review interface)
- Session replay (browse past agent session logs with timeline)
- Dashboard as aidevops agent (`@dashboard`) with self-update capability
- Notification system (desktop notifications, email digests)
**Timeline:** 3-5 sessions (10-18 hours total) with Opus 4.6

---

## Total Project Timeline

| Phase | Effort | Calendar Time (1-2 sessions/day) |
|-------|--------|----------------------------------|
| Phase 1 — Frontend Mockup | 2-4 hours | Day 1 |
| Phase 2 — Backend & Data | 6-10 hours | Days 2-4 |
| Phase 3 — Intelligence | 6-10 hours | Days 4-6 |
| Phase 4 — Access & Auth | 4-6 hours | Days 6-7 |
| Phase 5 — Write Ops | 6-10 hours | Days 7-9 |
| Phase 6 — Matrix & Domain | 10-18 hours | Days 9-14 |
| **Total** | **34-58 hours** | **~2 weeks at a comfortable pace** |

These assume Opus 4.6 doing the building with human review between sessions. The bottleneck isn't coding speed — it's your review/approval cycles and any debugging of external API integrations that behave differently than documented.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                      │
│  Tailwind CSS + shadcn/ui + Recharts + TanStack Table   │
│  Pages: Overview | Projects | Kanban | Health | Needs    │
│         Tokens | Agents | Documents | Matrix | Settings  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket (HTTPS via Tailscale)
┌──────────────────────┴──────────────────────────────────┐
│                  Bun.serve Backend                        │
│                                                          │
│  Auth:       Tailscale identity | Bearer token | Local   │
│  Parsers:    TODO.md | PLANS.md | SKILL.md | status     │
│  Collectors: System metrics | Ollama | Git APIs          │
│              Token usage | updown.io | PageSpeed         │
│  Writers:    TODO.md (atomic) | Config | Audit log       │
│  Watchers:   Filesystem (fsevents) for real-time         │
│  Proxy:      Matrix Client-Server API (Phase 6)          │
│  WebSocket:  Real-time push to frontend                  │
└──────────────────────┬──────────────────────────────────┘
                       │ Reads from / writes to
┌──────────────────────┴──────────────────────────────────┐
│              Data Sources                                │
│                                                          │
│  Local:    ~/.aidevops/ | TODO.md | ~/Git/*              │
│  APIs:     GitHub | Ollama | Anthropic | updown.io       │
│  CLI:      aidevops status | aidevops repos              │
│  SSH:      VPS metrics (VPS providers)               │
│  Tailscale: Mesh network for secure remote access        │
│  Matrix:   Conduit/Synapse Client-Server API (Phase 6)   │
└─────────────────────────────────────────────────────────┘
```

## Key Principles

1. **Plugin, not monolith** — Separate repo, separate versioning, reads from aidevops conventions
2. **Read-only until Phase 5** — Dashboard observes but doesn't modify until write-back is explicitly built and tested
3. **Filesystem-first** — No database. aidevops stores state in markdown and filesystem; the dashboard reads it directly
4. **Mock-first development** — Phase 1 is entirely mock data. Each subsequent phase replaces mock with real, one panel at a time
5. **Local-first, then Tailscale** — Runs on localhost first, Phase 4 extends to Tailscale mesh. No public internet exposure unless explicitly configured
6. **Confirm before write** — Every write action requires explicit user confirmation. No automatic mutations.
7. **AI-built** — Every line written by Opus 4.6 via OpenCode. Human reviews and approves.
