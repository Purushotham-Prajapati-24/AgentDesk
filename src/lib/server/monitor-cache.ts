type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const MAX_MEMORY_CACHE_ENTRIES = 1000;
const memoryCache = new Map<string, CacheEntry>();

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (hasRedisConfig()) {
    try {
      const value = await redisCommand<string | null>(["GET", key]);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        await redisCommand(["DEL", key]);
        return null;
      }
    } catch (error) {
      console.warn("[monitor-cache] Redis read failed; falling back to source data.", error);
      return null;
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  if (hasRedisConfig()) {
    try {
      await redisCommand(["SET", key, JSON.stringify(value), "EX", ttl]);
    } catch (error) {
      console.warn("[monitor-cache] Redis write failed; skipping cache write.", error);
    }
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
  pruneMemoryCache();
}

export async function deleteCachedPrefix(prefix: string) {
  if (hasRedisConfig()) {
    try {
      for await (const keys of scanKeys(`${prefix}*`)) {
        if (keys.length > 0) {
          await redisCommand(["DEL", ...keys]);
        }
      }
    } catch (error) {
      console.warn("[monitor-cache] Redis invalidation failed; cached data will expire by TTL.", error);
    }
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export function __clearMonitorMemoryCacheForTests() {
  memoryCache.clear();
}

function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL ?? "", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Upstash Redis command failed with ${response.status}${body ? `: ${body.slice(0, 500)}` : ""}.`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result as T;
}

async function* scanKeys(pattern: string) {
  let cursor = "0";
  do {
    const result = await redisCommand<[string, string[]]>(["SCAN", cursor, "MATCH", pattern, "COUNT", 100]);
    cursor = String(result[0]);
    yield result[1] ?? [];
  } while (cursor !== "0");
}

function pruneMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }

  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    // Short TTLs make FIFO eviction sufficient for the in-process fallback.
    const oldestKey = memoryCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      return;
    }
    memoryCache.delete(oldestKey);
  }
}
