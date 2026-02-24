import { config, loadSecrets } from "./config";
import { handleTasks } from "./routes/tasks";
import { handleAgents } from "./routes/agents";
import { handleStatus } from "./routes/status";
import { handleDocumentsTree, handleDocumentsContent } from "./routes/documents";
import { handleSettings } from "./routes/settings";
import { handleHealth, handleHealthLocal, handleHealthVPS } from "./routes/health";
import { handleOllama } from "./routes/ollama";
import { handleProjects } from "./routes/projects";
import { handleTokens, handleTokenModels, handleTokenProjects, handleTokenBudget, handleTokenSessions } from "./routes/tokens";
import { handleUptime } from "./routes/uptime";
import { handleNeeds } from "./routes/needs";
import { handleSSL } from "./routes/ssl";
import { handleAlerts } from "./routes/alerts";
import { addClient, removeClient, clientCount } from "./ws/realtime";
import { startFileWatchers } from "./watchers/file-watcher";
import { apiError } from "./routes/_helpers";

// Load secrets before starting
await loadSecrets();

// Start file watchers
startFileWatchers();

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  // Session A — filesystem parsers
  "/api/tasks": handleTasks,
  "/api/agents": handleAgents,
  "/api/status": handleStatus,
  "/api/documents/tree": handleDocumentsTree,
  "/api/documents/content": handleDocumentsContent,
  "/api/settings": handleSettings,
  // Session B — external collectors
  "/api/health": handleHealth,
  "/api/health/local": handleHealthLocal,
  "/api/health/vps": handleHealthVPS,
  "/api/ollama": handleOllama,
  "/api/projects": handleProjects,
  "/api/tokens": handleTokens,
  "/api/tokens/models": handleTokenModels,
  "/api/tokens/projects": handleTokenProjects,
  "/api/tokens/budget": handleTokenBudget,
  "/api/tokens/sessions": handleTokenSessions,
  "/api/uptime": handleUptime,
  "/api/needs": handleNeeds,
  // Phase 3 — intelligence & integrations
  "/api/ssl": handleSSL,
  "/api/alerts": handleAlerts,
};

const server = Bun.serve({
  port: config.port,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as unknown as Response;
    }

    // CORS headers for dev mode
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // API routes
    const handler = ROUTES[url.pathname];
    if (handler) {
      try {
        const response = await handler(req);
        // Add CORS headers to response
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
        return response;
      } catch (err) {
        return apiError("INTERNAL_ERROR", String(err), url.pathname);
      }
    }

    // Health check
    if (url.pathname === "/api/health/ping") {
      return Response.json({
        status: "ok",
        uptime: process.uptime(),
        wsClients: clientCount(),
        timestamp: new Date().toISOString(),
      }, { headers });
    }

    // Unknown API route
    if (url.pathname.startsWith("/api/")) {
      return apiError("NOT_FOUND", `Unknown endpoint: ${url.pathname}`, "router", 404);
    }

    // SPA fallback: serve client build
    try {
      const clientPath = new URL("../client/dist" + (url.pathname === "/" ? "/index.html" : url.pathname), import.meta.url).pathname;
      const file = Bun.file(clientPath);
      if (await file.exists()) {
        return new Response(file);
      }
      // SPA fallback — serve index.html for client-side routing
      const indexFile = Bun.file(new URL("../client/dist/index.html", import.meta.url).pathname);
      if (await indexFile.exists()) {
        return new Response(indexFile);
      }
    } catch {
      // Client not built yet
    }

    return new Response("Not found. Run `bun run build` in client/ first.", { status: 404 });
  },

  websocket: {
    open(ws) {
      addClient(ws);
      console.log(`[ws] Client connected (${clientCount()} total)`);
    },
    close(ws) {
      removeClient(ws);
      console.log(`[ws] Client disconnected (${clientCount()} total)`);
    },
    message(_ws, _message) {
      // Client messages not used yet — future: subscribe to specific channels
    },
  },
});

console.log(`
  AiDevOps Dashboard Server
  -------------------------
  HTTP:      http://localhost:${server.port}
  WebSocket: ws://localhost:${server.port}/ws
  Routes:    ${Object.keys(ROUTES).length} endpoints + /api/health/ping
  GitHub:    ${config.githubToken ? "configured" : "not configured"}
  VPS:       ${config.enableVPS && config.vpsHost ? config.vpsHost : "disabled"}
  Ollama:    ${config.ollamaHost}
  Uptime:    ${config.updownApiKey ? "configured" : "not configured"}
`);
