/**
 * UTM link builder for tracking campaign traffic in GA4.
 *
 * Every external link in docs, blog posts, and marketing content should use
 * trackedUrl() so GA4 can segment AI-referred sessions, organic traffic, and
 * cross-site referrals.
 *
 * Usage:
 *   trackedUrl("https://example.com", { source: "docs", campaign: "handoff-api" })
 *   // → https://example.com/?utm_source=docs&utm_medium=referral&utm_campaign=handoff-api
 */

export type UtmParams = {
  source: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

const UTM_SOURCE = "agentdesk";

/** Default medium for internal content links. */
const DEFAULT_MEDIUM = "referral";

/**
 * Append UTM tracking parameters to a URL.
 *
 * @param url - Base URL (absolute or relative).
 * @param params - UTM parameters. `source` defaults to "agentdesk", `medium` defaults to "referral".
 * @returns The URL with UTM query parameters appended.
 */
export function trackedUrl(
  url: string,
  params: UtmParams,
): string {
  const searchParams = new URLSearchParams();

  searchParams.set("utm_source", params.source ?? UTM_SOURCE);
  searchParams.set("utm_medium", params.medium ?? DEFAULT_MEDIUM);

  if (params.campaign) {
    searchParams.set("utm_campaign", params.campaign);
  }
  if (params.term) {
    searchParams.set("utm_term", params.term);
  }
  if (params.content) {
    searchParams.set("utm_content", params.content);
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${searchParams.toString()}`;
}

/**
 * Convenience: tracked doc link.
 * @param url - Absolute URL to external resource.
 * @param docSlug - The doc page slug hosting the link.
 */
export function trackedDocLink(url: string, docSlug: string): string {
  return trackedUrl(url, {
    source: UTM_SOURCE,
    medium: "docs",
    campaign: docSlug,
  });
}

/**
 * Convenience: tracked blog link.
 * @param url - Absolute URL to external resource.
 * @param postSlug - The blog post slug hosting the link.
 */
export function trackedBlogLink(url: string, postSlug: string): string {
  return trackedUrl(url, {
    source: UTM_SOURCE,
    medium: "blog",
    campaign: postSlug,
  });
}
