import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/config";

interface AuthState {
  authenticated: boolean;
  user: string | null;
  method: string | null;
  loading: boolean;
  error: string | null;
}

// In-memory token storage (intentionally NOT localStorage for security)
let sessionToken: string | null = null;

export function getAuthHeaders(): Record<string, string> {
  if (sessionToken) {
    return { Authorization: `Bearer ${sessionToken}` };
  }
  return {};
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    method: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const checkAuth = useCallback(async (token?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/status`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const data = json.data;

      if (mountedRef.current) {
        if (data.authenticated) {
          if (token) sessionToken = token;
          setState({
            authenticated: true,
            user: data.user,
            method: data.method,
            loading: false,
            error: null,
          });
        } else {
          setState({
            authenticated: false,
            user: null,
            method: null,
            loading: false,
            error: null,
          });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          authenticated: false,
          user: null,
          method: null,
          loading: false,
          error: String(err instanceof Error ? err.message : err),
        });
      }
    }
  }, []);

  const login = useCallback(
    async (token: string) => {
      await checkAuth(token);
    },
    [checkAuth]
  );

  const logout = useCallback(() => {
    sessionToken = null;
    setState({
      authenticated: false,
      user: null,
      method: null,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkAuth();
    return () => {
      mountedRef.current = false;
    };
  }, [checkAuth]);

  return { ...state, login, logout, refresh: checkAuth };
}
