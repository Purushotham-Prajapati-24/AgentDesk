import {
  createHandoffToken as createCoreHandoffToken,
  verifyHandoffToken as verifyCoreHandoffToken,
} from "./handoff-token-core.js";

export type HandoffTokenRole = "agent" | "server";

type HandoffTokenPayload = {
  tenant_id: string;
  session_id: string;
  role: HandoffTokenRole;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

export function createHandoffToken(input: Omit<HandoffTokenPayload, "iat" | "exp" | "jti">, now = Date.now()) {
  return createCoreHandoffToken(input, now);
}

export function verifyHandoffToken(token: string, expected: Pick<HandoffTokenPayload, "tenant_id" | "session_id" | "role">, now = Date.now()) {
  return verifyCoreHandoffToken(token, expected, now);
}
