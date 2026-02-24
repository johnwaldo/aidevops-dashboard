import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "@/lib/config";

interface WSMessage {
  type: "update";
  channel: string;
  data: unknown;
  timestamp: string;
}

export function useWebSocket(onMessage?: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          onMessage?.(msg);
        } catch {
          // ignore malformed messages
        }
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
