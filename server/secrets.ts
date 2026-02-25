/**
 * Secret management with TTL cache.
 *
 * Resolution order:
 *   1. `aidevops secret get <NAME>` (gopass-backed)
 *   2. `gh auth token` (GitHub token only)
 *   3. Environment variable fallback
 *
 * Secrets are cached for 5 minutes, never stored in the global config object.
 */

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const SECRET_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

async function runCommand(cmd: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode === 0 && text.trim()) {
      return text.trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveSecret(name: string): Promise<string | null> {
  // 1. Try aidevops secret (gopass-backed)
  const fromAidevops = await runCommand(["aidevops", "secret", "get", name]);
  if (fromAidevops) return fromAidevops;

  // 2. For GITHUB_TOKEN, try gh auth token as fallback
  if (name === "GITHUB_TOKEN") {
    const fromGh = await runCommand(["gh", "auth", "token"]);
    if (fromGh) return fromGh;
  }

  // 3. Fall back to environment variable
  const fromEnv = process.env[name];
  return fromEnv?.trim() || null;
}

/**
 * Get a secret by name with 5-minute TTL cache.
 * Never stores secrets in the global config object.
 */
export async function getSecret(name: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(name);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await resolveSecret(name);
  cache.set(name, { value, expiresAt: now + SECRET_TTL_MS });
  return value;
}

/**
 * Check if a secret is available (for startup logging / status checks).
 * Returns true/false without exposing the value.
 */
export async function hasSecret(name: string): Promise<boolean> {
  const value = await getSecret(name);
  return value !== null;
}
