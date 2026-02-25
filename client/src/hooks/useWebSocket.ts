import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "@/lib/config";

interface WSMessage {
  type: "update";
  channel: string;
  data: unknown;
  timestamp: string;
}

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export function useWebSocket(onMessage?: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        attemptRef.current = 0;

        // Request full state refresh after reconnect
        try {
          ws.send(JSON.stringify({ type: "refresh" }));
        } catch {
          // Ignore send errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
        attemptRef.current++;

        if (attemptRef.current > 10) {
          setStatus("disconnected");
        } else {
          setStatus("reconnecting");
        }

        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          onMessage?.(msg);
        } catch {
          // Ignore malformed messages
        }
      };
    } catch {
      if (mountedRef.current) {
        setStatus("reconnecting");
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
        attemptRef.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    }
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected: status === "connected", status };
}
