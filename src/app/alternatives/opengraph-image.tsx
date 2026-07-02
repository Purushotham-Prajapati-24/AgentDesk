import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export const alt = "AgentDesk — Compare AI Support Platforms Side by Side";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogImageResponse(
    "Compare Alternatives",
    "Honest head-to-head comparisons: Chatbase, DocsBot, SiteGPT vs AgentDesk.",
  );
}
