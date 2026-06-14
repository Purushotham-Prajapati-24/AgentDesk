import { NextResponse } from "next/server";
import { WebChatConfigPatchSchema } from "@/lib/webchat-config";
import { getWebChatConfig, updateWebChatConfig } from "@/lib/server/webchat-config-store";
import { requireAuthenticatedTenant } from "@/lib/server/route-auth";
import { createAdminClient } from "@/lib/server/appwrite";

type WebChatConfigUpdatePayload = {
  tenant_id?: unknown;
  config?: unknown;
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const updatePayload = payload as WebChatConfigUpdatePayload;
  const tenantId = typeof updatePayload?.tenant_id === "string" ? updatePayload.tenant_id.trim() : "";
  if (!isSafeId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SCOPE",
          message: "tenant_id is required to update WebChat configuration.",
        },
      },
      { status: 422 },
    );
  }

  const parsedPatch = WebChatConfigPatchSchema.safeParse(updatePayload.config);
  if (!parsedPatch.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsedPatch.error.issues[0]?.message ?? "Invalid WebChat configuration.",
          details: parsedPatch.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  try {
    await requireAuthenticatedTenant(tenantId);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required to update WebChat configuration.",
        },
      },
      { status: 401 },
    );
  }

  try {
    const currentConfig = await getWebChatConfig();
    const botIdToCheck = parsedPatch.data.deploy?.botId || currentConfig.deploy.botId;

    if (botIdToCheck) {
      const { databases } = await createAdminClient();
      const bot = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID ?? "agentdesk",
        process.env.APPWRITE_BOTS_COLLECTION_ID ?? "bots",
        botIdToCheck
      );
      if (bot.tenant_id !== tenantId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You are not authorized to update configuration for this bot.",
            },
          },
          { status: 403 },
        );
      }
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The specified bot does not exist.",
        },
      },
      { status: 404 },
    );
  }

  const config = await updateWebChatConfig(parsedPatch.data);

  return NextResponse.json({
    success: true,
    data: {
      config,
    },
  });
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}
