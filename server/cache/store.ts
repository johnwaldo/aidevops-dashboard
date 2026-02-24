interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL: Record<string, number> = {
  tasks: 5,
  agents: 300,
  status: 60,
  healthLocal: 15,
  healthVPS: 30,
  ollama: 10,
  projects: 300,
  tokens: 300,
  uptime: 120,
  documents: 30,
  settings: 600,
};

export function cacheGet<T>(key: string): { data: T; cached: boolean; timestamp: string; ttl: number } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = (Date.now() - entry.timestamp) / 1000;
  if (age > entry.ttl) {
    store.delete(key);
    return null;
  }

  return {
    data: entry.data,
    cached: true,
    timestamp: new Date(entry.timestamp).toISOString(),
    ttl: Math.round(entry.ttl - age),
  };
}

export function cacheSet<T>(key: string, data: T, ttl?: number): void {
  store.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl ?? CACHE_TTL[key] ?? 60,
  });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
