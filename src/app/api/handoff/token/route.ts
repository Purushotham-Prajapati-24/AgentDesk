import { createHandoffToken } from "@/lib/server/handoff-token";
import { requireAuthenticatedTenant } from "@/lib/server/route-auth";

type HandoffTokenRequest = {
  tenant_id?: unknown;
  session_id?: unknown;
};

export async function POST(request: Request) {
  let body: HandoffTokenRequest;
  try {
    body = (await request.json()) as HandoffTokenRequest;
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!isSafeId(tenantId) || !isSafeId(sessionId)) {
    return jsonError("INVALID_ROOM", "tenant_id and session_id are required.", 422);
  }

  let user;
  try {
    user = await requireAuthenticatedTenant(tenantId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to authorize handoff access.";
    return jsonError("UNAUTHORIZED", message, 401);
  }

  try {
    const token = createHandoffToken({
      tenant_id: tenantId,
      session_id: sessionId,
      role: "agent",
      sub: user.$id,
    });
    return Response.json({ success: true, data: { token } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token creation failed.";
    return jsonError("TOKEN_CREATION_FAILED", message, 500);
  }
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}
