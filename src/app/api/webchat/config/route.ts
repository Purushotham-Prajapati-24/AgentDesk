import { NextResponse } from "next/server";
import { getWebChatConfig } from "@/lib/server/webchat-config-store";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      config: await getWebChatConfig(),
    },
  });
}
