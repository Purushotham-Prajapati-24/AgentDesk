import { NextResponse } from "next/server";
import { WebChatConfigPatchSchema } from "@/lib/webchat-config";
import { updateWebChatConfig } from "@/lib/server/webchat-config-store";
import { requireAuthenticatedUser } from "@/lib/server/route-auth";

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

  const parsedPatch = WebChatConfigPatchSchema.safeParse(payload);
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
    await requireAuthenticatedUser();
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

  const config = await updateWebChatConfig(parsedPatch.data);

  return NextResponse.json({
    success: true,
    data: {
      config,
    },
  });
}
