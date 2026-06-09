type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (hasRedisConfig()) {
    const value = await redisCommand<string | null>(["GET", key]);
    return value ? (JSON.parse(value) as T) : null;
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
    await redisCommand(["SET", key, JSON.stringify(value), "EX", ttl]);
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function deleteCachedPrefix(prefix: string) {
  if (hasRedisConfig()) {
    const keys = (await redisCommand<string[] | null>(["KEYS", `${prefix}*`])) ?? [];
    if (keys.length > 0) {
      await redisCommand(["DEL", ...keys]);
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
    throw new Error(`Upstash Redis command failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result as T;
}
