import { incrementCacheKey } from "./monitor-cache.ts";

export function isCaptchaRequired(): boolean {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  return !!(siteKey || secretKey || process.env.NODE_ENV === "production");
}

export function validateTurnstileConfig(): { valid: boolean; siteKeySet: boolean; secretKeySet: boolean } {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isProd = process.env.NODE_ENV === "production";
  
  if (isProd) {
    // In production, both keys must be present
    return {
      valid: !!(siteKey && secretKey),
      siteKeySet: !!siteKey,
      secretKeySet: !!secretKey,
    };
  }
  
  // In development/test, they must either be both present or both missing
  return {
    valid: !((siteKey && !secretKey) || (!siteKey && secretKey)),
    siteKeySet: !!siteKey,
    secretKeySet: !!secretKey,
  };
}

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  if (!isCaptchaRequired()) {
    return true;
  }

  // Validate IP format
  if (!/^[0-9a-fA-F:.]{2,45}$/.test(ip)) {
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
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY ?? "",
        response: token,
        remoteip: ip,
      }),
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

    // Validate IP format to prevent injection attacks and fragmentation
    if (!/^[0-9a-fA-F:.]{2,45}$/.test(ip)) {
      console.error(`[Rate Limiter] Invalid IP address format: ${ip}`);
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    // Note: IP rate limit is checked and incremented first to protect the email retry budget
    // from being consumed by requests that are already blocked by IP limits (e.g. email DoS defense).
    // Expiration TTL uses a fixed window (starts at the first increment, subsequent increments
    // do not extend the lockout window). This prevents perpetual lockout on repeated attempts.
    
    // Check/Increment IP limit: Max 5 requests per 10 minutes (600s)
    const ipCount = await incrementCacheKey(ipKey, 600);
    if (ipCount > 5) {
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    // Check/Increment email limit: Max 4 requests per 10 minutes (600s)
    const emailCount = await incrementCacheKey(emailKey, 600);
    if (emailCount > 4) {
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    return { limited: false };
  } catch (error) {
    console.error("Rate limiting check error (failing open):", error);
    return { limited: false };
  }
}
