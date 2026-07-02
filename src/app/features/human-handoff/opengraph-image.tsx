import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export const alt = "AgentDesk — Human Handoff: When the AI Agent Knows It Should Stop";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogImageResponse(
    "Human Handoff",
    "Automation pauses. Context transfers. Operator replies inline. No channel switch.",
  );
}
