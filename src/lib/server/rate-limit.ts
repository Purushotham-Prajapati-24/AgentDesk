import { incrementCacheKey as defaultIncrement } from "./monitor-cache.ts";
import { isIP } from "node:net";

let incrementFn = defaultIncrement;

export function __setIncrementFnForTests(fn: typeof defaultIncrement) {
  incrementFn = fn;
}

export function isValidIp(ip: string): boolean {
  return isIP(ip) !== 0;
}

export async function getClientIp(headersList: Headers): Promise<string> {
  let ip = "";

  // 1. Check custom trusted proxy header if configured
  const trustedHeader = process.env.TRUSTED_PROXY_HEADER;
  if (trustedHeader) {
    const rawHeader = headersList.get(trustedHeader) || "";
    if (rawHeader) {
      const parts = rawHeader.split(",");
      ip = parts[parts.length - 1].trim();
    }
  }

  // 2. Check standard cloud-provider proxy headers (cf-connecting-ip, x-real-ip)
  if (!ip) {
    ip = headersList.get("cf-connecting-ip") || headersList.get("x-real-ip") || "";
  }

  // 3. Fallback to X-Forwarded-For if explicitly trusted
  if (!ip) {
    const xff = headersList.get("x-forwarded-for") || "";
    if (xff) {
      if (process.env.TRUST_X_FORWARDED_FOR === "true") {
        const parts = xff.split(",");
        ip = parts[parts.length - 1].trim();
      } else {
        console.warn("[getClientIp] X-Forwarded-For header present but TRUST_X_FORWARDED_FOR is not enabled. Ignoring untrusted header.");
      }
    }
  }

  // 4. Handle missing IP and validation
  if (!ip) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[getClientIp] No trusted proxy headers detected (cf-connecting-ip, x-real-ip) and no TRUSTED_PROXY_HEADER or TRUST_X_FORWARDED_FOR is configured. Falling back to 'unknown-ip' (IP-based rate limiting will be bypassed).");
      return "unknown-ip";
    }
    return "127.0.0.1";
  }

  // Validate IPv4 or IPv6 address format to prevent injection attacks and fragmentation
  if (!isValidIp(ip)) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[getClientIp] Invalid IP address format: "${ip}". Falling back to 'unknown-ip'.`);
      return "unknown-ip";
    }
    return "127.0.0.1";
  }

  return ip;
}

export function isCaptchaRequired(): boolean {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  return !!(siteKey || secretKey);
}

export function validateTurnstileConfig(): { valid: boolean; siteKeySet: boolean; secretKeySet: boolean } {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  // Configuration is valid if both keys are present (enabled) or both are missing (disabled)
  const valid = !((siteKey && !secretKey) || (!siteKey && secretKey));
  
  return {
    valid,
    siteKeySet: !!siteKey,
    secretKeySet: !!secretKey,
  };
}

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  if (!isCaptchaRequired()) {
    return true;
  }

  // Validate IP format if connection IP is resolved
  if (ip !== "unknown-ip" && !isValidIp(ip)) {
    console.error(`[Turnstile] Invalid IP address format: ${ip}`);
    return false; // Fail-closed
  }

  const config = validateTurnstileConfig();
  if (!config.valid) {
    console.error(
      `[Turnstile] Misconfigured Turnstile environment variables. Site Key: ${config.siteKeySet ? "set" : "missing"}, Secret Key: ${config.secretKeySet ? "set" : "missing"}`
    );
    return false; // Fail-closed
  }

  try {
    const bodyParams = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY ?? "",
      response: token,
    });
    if (ip !== "unknown-ip") {
      bodyParams.append("remoteip", ip);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams,
    });

    if (!res.ok) {
      console.warn(`[Turnstile] Upstream siteverify request failed with status: ${res.status}`);
      return false; // Fail-closed
    }

    const outcome = await res.json();
    
    if (!outcome.success) {
      console.warn("[Turnstile] Verification failed. Error codes:", outcome["error-codes"]);
      return false;
    }

    if (outcome.action !== "login") {
      console.warn(`[Turnstile] Action mismatch. Expected 'login', got '${outcome.action}'`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false; // Fail-closed
  }
}

export async function isRateLimited(email: string, ip: string): Promise<{ limited: boolean; reason?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = `rate-limit:email:${normalizedEmail}`;
    const ipKey = `rate-limit:ip:${ip}`;

    // Note: IP rate limit is checked and incremented first to protect the email retry budget
    // from being consumed by requests that are already blocked by IP limits (e.g. email DoS defense).
    // Expiration TTL uses a fixed window (starts at the first increment, subsequent increments
    // do not extend the lockout window). This prevents perpetual lockout on repeated attempts.
    
    // Check/Increment IP limit if Connection IP is resolved
    if (ip !== "unknown-ip") {
      // Validate IP format to prevent injection attacks and fragmentation
      if (!isValidIp(ip)) {
        console.error(`[Rate Limiter] Invalid IP address format: ${ip}`);
        return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
      }

      const ipCount = await incrementFn(ipKey, 600);
      if (ipCount > 5) {
        return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
      }
    }

    // Check/Increment email limit: Max 4 requests per 10 minutes (600s)
    const emailCount = await incrementFn(emailKey, 600);
    if (emailCount > 4) {
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    return { limited: false };
  } catch (error) {
    console.error("Rate limiting check error (failing open):", error);
    return { limited: false };
  }
}
