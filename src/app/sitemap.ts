import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getAllContentRoutes } from "@/lib/content";

/**
 * sitemap.ts — lists every publicly indexable route.
 *
 * Phase 1: marketing homepage and developer docs hub.
 * Phase 2: content pillar pages, blog posts, comparison pages, feature pages,
 * and individual doc pages — all derived from the content manifest so adding
 * a new post updates the sitemap automatically.
 * Phase 3 will add alternates.languages for hreflang (en-IN / en-US).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Fixed high-priority routes — the homepage and docs hub.
  const fixedRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/docs"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // All Phase 2 content routes from the manifest.
  const contentRoutes: MetadataRoute.Sitemap = getAllContentRoutes().map(
    (route) => ({
      url: absoluteUrl(route.path),
      lastModified: new Date(route.lastModified),
      changeFrequency: "monthly" as const,
      // Pillar pages get higher priority than individual spokes.
      priority: route.path === "/ai-support-agent" ? 0.9 : 0.7,
    }),
  );

  return [...fixedRoutes, ...contentRoutes];
}
