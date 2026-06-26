import { incrementCacheKey } from "./monitor-cache.ts";

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Enforce configuration consistency
  if (siteKey || secretKey) {
    if (!siteKey || !secretKey) {
      console.error(
        `[Turnstile] Misconfigured Turnstile environment variables. Site Key: ${siteKey ? "set" : "missing"}, Secret Key: ${secretKey ? "set" : "missing"}`
      );
      return false; // Fail-closed
    }
  } else {
    // Both keys are missing. Fail-closed in production, allow bypass in local dev
    if (process.env.NODE_ENV === "production") {
      console.error("[Turnstile] CAPTCHA keys are missing in production environment.");
      return false; // Fail-closed
    }
    return true; // Pass in local development if not configured
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

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
