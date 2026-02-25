import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, AlertCircle } from "lucide-react";

interface LoginGateProps {
  children: React.ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const { authenticated, loading, error, user, method, login } = useAuth();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-[#71717a] font-mono">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Authenticated — render dashboard
  if (authenticated) {
    return <>{children}</>;
  }

  // Not authenticated — show login form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setSubmitting(true);
    setLoginError(null);

    try {
      await login(token.trim());
      // If still not authenticated after login attempt, show error
      // (useAuth will update state, but we check synchronously here)
      setTimeout(() => {
        setSubmitting(false);
      }, 500);
    } catch {
      setLoginError("Authentication failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-sm rounded-lg border border-[#1e1e2e] bg-[#111118] p-8">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
            <Lock className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-[#e4e4e7] font-[Plus_Jakarta_Sans]">
              AiDevOps Dashboard
            </h1>
            <p className="text-xs text-[#71717a] mt-1">
              Enter your access token to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Bearer token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] font-mono text-sm placeholder:text-[#71717a]/50"
            autoFocus
            disabled={submitting}
          />

          {(loginError || error) && (
            <div className="flex items-center gap-2 rounded bg-rose-500/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-400">{loginError || error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !token.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Authenticate"
            )}
          </Button>
        </form>

        <p className="text-[10px] text-[#71717a] text-center mt-4">
          Localhost and Tailscale connections authenticate automatically
        </p>
      </div>
    </div>
  );
}
