import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 5 * 60;

export function createHandoffToken(input, now = Date.now()) {
  if (!input || typeof input.sub !== "string" || !input.sub) {
    throw new Error("sub (user identity) is required for handoff tokens.");
  }
  const payload = {
    ...input,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyHandoffToken(token, expected, now = Date.now()) {
  if (typeof token !== "string") {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  if (extra || !encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  return (
    payload.tenant_id === expected.tenant_id &&
    payload.session_id === expected.session_id &&
    payload.role === expected.role &&
    typeof payload.sub === "string" &&
    typeof payload.jti === "string" &&
    Number.isFinite(payload.iat) &&
    Number.isFinite(payload.exp) &&
    payload.iat <= Math.floor(now / 1000) &&
    payload.exp >= Math.floor(now / 1000)
  );
}

/**
 * Decodes a token's payload without re-verifying the signature.
 * Only call this AFTER a successful verifyHandoffToken() — the token is already trusted.
 * Returns null if the payload cannot be parsed.
 */
export function decodeHandoffTokenPayload(token) {
  if (typeof token !== "string") return null;
  const [encodedPayload] = token.split(".");
  if (!encodedPayload) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function sign(encodedPayload) {
  return createHmac("sha256", handoffTokenSecret()).update(encodedPayload).digest("base64url");
}

function handoffTokenSecret() {
  const secret = process.env.HANDOFF_TOKEN_SECRET;
  if (!secret) {
    throw new Error("HANDOFF_TOKEN_SECRET must be configured for handoff tokens.");
  }

  return secret;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
