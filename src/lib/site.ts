/**
 * Central site configuration for SEO / GEO / AEO.
 *
 * Every canonical URL, OpenGraph image, sitemap entry, robots rule, and JSON-LD
 * node reads from here so the production domain can be swapped in one place.
 *
 * Set NEXT_PUBLIC_SITE_URL in the environment (Vercel project env or .env.local).
 * Defaults to the current Vercel preview URL — change before link-building.
 */

/** Raw origin from env, with a safe fallback for local/preview. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_VERCEL_URL ??
  "https://agentdeskbot.vercel.app"
)
  // Vercel doesn't include a protocol on NEXT_PUBLIC_VERCEL_URL.
  .replace(/^\/\//, "https://")
  .replace(/\/$/, "");

/** Parsed base URL — used for metadataBase and absolute URL composition. */
export const siteOrigin = new URL(SITE_URL);

/** Public brand strings used across metadata, schema, and the manifest. */
export const SITE_NAME = "AgentDesk";
export const SITE_TAGLINE = "AI Support Agent with Verified Answers and Human Handoff";
export const SITE_DESCRIPTION =
  "AgentDesk is an AI support agent that grounds every answer in your own documents, embeds as a chat widget, and hands off to a human operator when judgment matters. Built for RAG, live takeover, and tenant isolation.";
export const SITE_OG_IMAGE = "/opengraph-image.png";

/** Locale + market (India + Global per SEO plan). */
export const SITE_LOCALE = "en_US";
export const SITE_LOCALE_ALT = "en_IN";

/** Where the project lives (used in SoftwareApplication schema). */
export const SITE_REPOSITORY = "https://github.com/Purushotham-Prajapati-24/AgentDesk";

/**
 * Site-wide publication baseline — used as the fallback for sitemap last-modified
 * timestamps and as the canonical `datePublished` on every page until per-page
 * overrides are needed. ISO-8601 date string (YYYY-MM-DD).
 *
 * Google / AI crawlers treat this as the initial freshness signal; keeping it
 * current improves E-E-A-T perception. Bump this date whenever the site receives
 * a meaningful content update.
 */
export const SITE_PUBLISH_DATE = "2026-07-01";

/** Join a path onto SITE_URL, normalizing duplicate slashes. */
export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
