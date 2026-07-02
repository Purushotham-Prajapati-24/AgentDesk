import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export const alt = "AgentDesk Blog — AI Support Agent Insights";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogImageResponse(
    "AI Support Agent Insights",
    "Deep dives on RAG chatbots, human handoff, and support automation.",
  );
}
