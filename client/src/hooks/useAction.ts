import { useState, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/config";
import { getAuthHeaders } from "@/hooks/useAuth";

type ActionState = "idle" | "loading" | "success" | "error";

interface UseActionOptions {
  endpoint: string;
  method?: "POST" | "PUT" | "DELETE";
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

interface UseActionResult {
  execute: (body: Record<string, unknown>) => Promise<boolean>;
  state: ActionState;
  error: string | null;
  loading: boolean;
  success: boolean;
  reset: () => void;
}

export function useAction(options: UseActionOptions): UseActionResult {
  const [state, setState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Use refs for callbacks to avoid stale closures without adding to deps
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      setState("loading");
      setError(null);

      try {
        const response = await fetch(`${API_BASE}${optionsRef.current.endpoint}`, {
          method: optionsRef.current.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          const msg = errBody?.error?.message ?? `HTTP ${response.status}`;
          throw new Error(msg);
        }

        const data = await response.json();
        setState("success");
        optionsRef.current.onSuccess?.(data);

        // Reset to idle after 2s
        setTimeout(() => setState("idle"), 2000);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState("error");
        setError(msg);
        optionsRef.current.onError?.(msg);
        return false;
      }
    },
    [], // No dependencies - using ref instead
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return {
    execute,
    state,
    error,
    loading: state === "loading",
    success: state === "success",
    reset,
  };
}
