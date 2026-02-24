import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/config";

interface ApiResponse<T> {
  data: T;
  meta: { source: string; timestamp: string; cached: boolean; ttl: number };
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  stale: boolean;
}

export function useApiData<T>(endpoint: string, refreshInterval?: number): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/${endpoint}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ApiResponse<T>;
      if (mountedRef.current) {
        setData(json.data);
        setError(null);
        setStale(false);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(String(err instanceof Error ? err.message : err));
        setLoading(false);
        if (data !== null) setStale(true);
      }
    }
  }, [endpoint]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchData();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (refreshInterval && refreshInterval > 0) {
      interval = setInterval(fetchData, refreshInterval * 1000);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData, stale };
}
