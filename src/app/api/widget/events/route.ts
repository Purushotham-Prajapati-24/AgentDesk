import { NextRequest } from "next/server";

type WidgetEventPayload = {
  botId?: unknown;
  tenantId?: unknown;
  sessionToken?: unknown;
  eventName?: unknown;
  variantId?: unknown;
  metadata?: unknown;
};

const EVENT_NAMES = new Set(["proactive_shown", "proactive_dismissed", "proactive_opened_chat", "proactive_cta_clicked"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WidgetEventPayload;
    const eventName = typeof payload.eventName === "string" ? payload.eventName : "";

    if (!EVENT_NAMES.has(eventName)) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    console.info("widget_event", {
      botId: cleanText(payload.botId, 80),
      tenantId: cleanText(payload.tenantId, 80),
      sessionToken: cleanText(payload.sessionToken, 120),
      eventName,
      variantId: cleanText(payload.variantId, 60),
      metadata: sanitizeMetadata(payload.metadata),
    });
  } catch {
    // Best-effort telemetry endpoint. Invalid events should not affect widget UX.
  }

  return new Response(null, { status: 204, headers: corsHeaders });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength) : "";
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 10)
      .map(([key, entry]) => [cleanText(key, 40), cleanText(entry, 120)])
      .filter(([key]) => key),
  );
}
