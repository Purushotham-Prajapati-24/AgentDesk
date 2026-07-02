import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export const alt = "AgentDesk — Developer Docs: Embed, Configure & Operate";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogImageResponse(
    "Developer Documentation",
    "Embed the widget, configure RAG knowledge, integrate human handoff, and use the chat API.",
  );
}
