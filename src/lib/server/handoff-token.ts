import { createHmac, timingSafeEqual } from "node:crypto";

export type HandoffTokenRole = "agent" | "server";

type HandoffTokenPayload = {
  tenant_id: string;
  session_id: string;
  role: HandoffTokenRole;
  sub: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = 5 * 60;

export function createHandoffToken(input: Omit<HandoffTokenPayload, "exp">, now = Date.now()) {
  const payload: HandoffTokenPayload = {
    ...input,
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyHandoffToken(token: string, expected: Pick<HandoffTokenPayload, "tenant_id" | "session_id" | "role">, now = Date.now()) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return false;
  }

  let payload: HandoffTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as HandoffTokenPayload;
  } catch {
    return false;
  }

  return (
    payload.tenant_id === expected.tenant_id &&
    payload.session_id === expected.session_id &&
    payload.role === expected.role &&
    Number.isFinite(payload.exp) &&
    payload.exp >= Math.floor(now / 1000)
  );
}

function sign(encodedPayload: string) {
  return createHmac("sha256", handoffTokenSecret()).update(encodedPayload).digest("base64url");
}

function handoffTokenSecret() {
  const secret = process.env.HANDOFF_TOKEN_SECRET || process.env.APPWRITE_API_KEY;
  if (!secret) {
    throw new Error("HANDOFF_TOKEN_SECRET or APPWRITE_API_KEY must be configured for handoff tokens.");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
