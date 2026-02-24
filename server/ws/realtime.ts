import type { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket<unknown>>();

export function addClient(ws: ServerWebSocket<unknown>): void {
  clients.add(ws);
}

export function removeClient(ws: ServerWebSocket<unknown>): void {
  clients.delete(ws);
}

export function broadcast(channel: string, data: unknown): void {
  const message = JSON.stringify({
    type: "update",
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const ws of clients) {
    try {
      ws.send(message);
    } catch {
      clients.delete(ws);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
