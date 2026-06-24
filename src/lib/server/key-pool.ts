// In-memory cooldown tracking — module-level Map persists across requests in the
// same Next.js process. In serverless environments (e.g., Vercel / AWS Lambda),
// this is best-effort since cold starts get fresh process instances, but it avoids
// a third-party state store (like Redis) round-trip on the hot path.
//
// Concurrency Note: Key selection via next() is best-effort and does not reserve/lock
// keys during active in-flight requests. Under high concurrent load, multiple requests
// may select the same key in the same tick before any request returns a rate limit (429)
// and updates the Map.
const cooldowns = new Map<string, number>(); // key → expiry timestamp (ms)

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 65_000; // 65 s (RPM window + 5 s buffer)
const DEAD_KEY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h

export class KeyPool {
  private readonly keys: string[];
  readonly name: string;
  private cursor = 0;

  constructor(name: string, keys: string[]) {
    this.name = name;
    this.keys = [...new Set(keys.filter(Boolean))];
  }

  /** Exposes a safe identifier for logs without leaking PII key suffixes. */
  getKeyIdentifier(key: string): string {
    const idx = this.keys.indexOf(key);
    return idx !== -1 ? `key #${idx}` : "unknown key";
  }

  /**
   * Returns the next available (not cooling down) key using round-robin,
   * or null when every key in the pool is currently rate-limited / dead.
   */
  next(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.cursor + i) % this.keys.length;
      const key = this.keys[idx];
      if (now >= (cooldowns.get(key) ?? 0)) {
        this.cursor = (idx + 1) % this.keys.length;
        return key;
      }
    }
    return null; // all keys exhausted
  }

  /**
   * Marks a key as rate-limited.
   * Pass the parsed value from the `Retry-After` response header when available.
   */
  markRateLimited(key: string, retryAfterSeconds?: number): void {
    const ms = (retryAfterSeconds ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS / 1000) * 1000;
    cooldowns.set(key, Date.now() + ms);
    console.warn(
      `[key-pool:${this.name}] ${this.getKeyIdentifier(key)} rate-limited for ${Math.round(ms / 1000)}s`,
    );
  }

  /**
   * Marks a key as permanently dead (auth error).
   * It will be skipped for 24 hours to avoid wasting requests.
   */
  markDead(key: string): void {
    cooldowns.set(key, Date.now() + DEAD_KEY_COOLDOWN_MS);
    console.error(
      `[key-pool:${this.name}] ${this.getKeyIdentifier(key)} marked dead (auth failure)`,
    );
  }

  /** Number of configured keys (regardless of cooldown state). */
  get size(): number {
    return this.keys.length;
  }

  /** How many keys are currently available (not cooling down). */
  available(): number {
    const now = Date.now();
    return this.keys.filter((k) => now >= (cooldowns.get(k) ?? 0)).length;
  }
}

/**
 * Parse a comma-separated env var into a deduped, trimmed key list.
 * Falls back to `singleKey` so single-key env vars keep working.
 */
export function parseKeyList(multi?: string, singleKey?: string): string[] {
  const combined = [multi ?? "", singleKey ?? ""]
    .flatMap((s) => s.split(","))
    .map((k) => k.trim())
    .filter(Boolean);
  return [...new Set(combined)];
}

/** Parse the `Retry-After` HTTP header value (seconds or HTTP-date). */
export function parseRetryAfter(header: string | null): number {
  if (!header) return 65;
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds + 2 : 65; // +2 s buffer
}
