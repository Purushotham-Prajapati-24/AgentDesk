import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * robots.ts — tells crawlers which routes to access.
 *
 * Strategy:
 *  - Default rule (*): allow public pages, disallow private/dashboard/API routes.
 *  - AI-crawler rule: explicitly allow GPTBot, Claude-Web, PerplexityBot, etc.
 *    so they can cite AgentDesk content. This is the GEO lever — without it,
 *    some AI engines respect a generic robots.txt and may defer crawling.
 *  - Sitemap pointer for all bots.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs"],
        disallow: [
          "/api/",
          "/embed/",
          "/login",
          "/verify",
          "/documents",
          "/inbox",
          "/bots",
          "/webchat",
          "/monitor/",
          "/billing",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Claude-Web",
          "ClaudeBot",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Bytespider",
          "CCBot",
          "Amazonbot",
        ],
        allow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
