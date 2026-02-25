interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  sizeBytes: number;
}

const MAX_CACHE_BYTES = 128 * 1024 * 1024; // 128MB
const store = new Map<string, CacheEntry<unknown>>();
let currentSizeBytes = 0;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

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
  ssl: 3600,
  ci: 120,
  pagespeed: 86400, // 24 hours
};

function estimateSize(data: unknown): number {
  try {
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
  } catch {
    return 1024; // Fallback
  }
}

function evictExpired(): number {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of store) {
    const age = (now - entry.timestamp) / 1000;
    if (age > entry.ttl) {
      currentSizeBytes -= entry.sizeBytes;
      store.delete(key);
      evicted++;
    }
  }
  return evicted;
}

function evictOldest(): void {
  // Evict entries until under limit, oldest first
  const entries = [...store.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  for (const [key, entry] of entries) {
    if (currentSizeBytes <= MAX_CACHE_BYTES) break;
    currentSizeBytes -= entry.sizeBytes;
    store.delete(key);
  }
}

export function cacheGet<T>(key: string): { data: T; cached: boolean; timestamp: string; ttl: number } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = (Date.now() - entry.timestamp) / 1000;
  if (age > entry.ttl) {
    currentSizeBytes -= entry.sizeBytes;
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
  // Remove old entry size if replacing
  const existing = store.get(key);
  if (existing) {
    currentSizeBytes -= existing.sizeBytes;
  }

  const sizeBytes = estimateSize(data);

  // Evict expired first, then oldest if still over limit
  if (currentSizeBytes + sizeBytes > MAX_CACHE_BYTES) {
    evictExpired();
  }
  if (currentSizeBytes + sizeBytes > MAX_CACHE_BYTES) {
    evictOldest();
  }

  store.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl ?? CACHE_TTL[key] ?? 60,
    sizeBytes,
  });
  currentSizeBytes += sizeBytes;
}

export function cacheInvalidate(key: string): void {
  const entry = store.get(key);
  if (entry) {
    currentSizeBytes -= entry.sizeBytes;
    store.delete(key);
  }
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const [key, entry] of store) {
    if (key.startsWith(prefix)) {
      currentSizeBytes -= entry.sizeBytes;
      store.delete(key);
    }
  }
}

export function cacheStats(): { entries: number; sizeBytes: number; maxBytes: number; sizeMB: string } {
  return {
    entries: store.size,
    sizeBytes: currentSizeBytes,
    maxBytes: MAX_CACHE_BYTES,
    sizeMB: `${(currentSizeBytes / 1024 / 1024).toFixed(2)}MB / ${MAX_CACHE_BYTES / 1024 / 1024}MB`,
  };
}

export function startCacheCleanup(intervalMs = 60_000): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    evictExpired();
  }, intervalMs);
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
