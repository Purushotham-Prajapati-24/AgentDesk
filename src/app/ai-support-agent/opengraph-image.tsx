import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export const alt = "AgentDesk — AI Support Agent with Verified Answers & Human Handoff";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogImageResponse(
    "AI Support Agent",
    "Verified answers from your documents. Human handoff when judgment matters.",
  );
}
