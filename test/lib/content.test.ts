import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://agentdeskbot.vercel.app";
});

const {
  blogPosts,
  docPages,
  comparisonPages,
  featurePages,
  getBlogPost,
  getDocPage,
  getAllContentRoutes,
} = await import("../../src/lib/content");

describe("blogPosts", () => {
  it("exports blog posts with required fields", () => {
    for (const post of blogPosts) {
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.readingTime).toMatch(/\d+ min read/);
    }
  });

  it("contains expected posts", () => {
    const slugs = blogPosts.map((p) => p.slug);
    expect(slugs).toContain("what-is-rag-chatbot");
    expect(slugs).toContain("how-to-build-rag-chatbot");
    expect(slugs).toContain("best-ai-support-tools-2026");
  });
});

describe("docPages", () => {
  it("exports doc pages with readingTime", () => {
    for (const doc of docPages) {
      expect(doc.readingTime).toMatch(/\d+ min read/);
      expect(doc.slug).toBeTruthy();
      expect(doc.title).toBeTruthy();
    }
  });

  it("contains expected docs", () => {
    const slugs = docPages.map((d) => d.slug);
    expect(slugs).toContain("quickstart");
    expect(slugs).toContain("embed-widget");
    expect(slugs).toContain("api-reference");
  });
});

describe("getBlogPost", () => {
  it("returns the matching post for a valid slug", () => {
    const post = getBlogPost("what-is-rag-chatbot");
    expect(post).toBeDefined();
    expect(post!.title).toContain("RAG Chatbot");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getBlogPost("nonexistent-slug")).toBeUndefined();
  });
});

describe("getDocPage", () => {
  it("returns the matching doc for a valid slug", () => {
    const doc = getDocPage("quickstart");
    expect(doc).toBeDefined();
    expect(doc!.title).toContain("Quickstart");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getDocPage("nonexistent-slug")).toBeUndefined();
  });
});

describe("getAllContentRoutes", () => {
  const routes = getAllContentRoutes();

  it("includes the pillar page", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/ai-support-agent");
  });

  it("includes the blog index", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/blog");
  });

  it("includes all blog posts", () => {
    for (const post of blogPosts) {
      expect(routes.some((r) => r.path === `/blog/${post.slug}`)).toBe(true);
    }
  });

  it("includes all doc pages", () => {
    for (const doc of docPages) {
      expect(routes.some((r) => r.path === `/docs/${doc.slug}`)).toBe(true);
    }
  });

  it("includes all comparison pages", () => {
    for (const comp of comparisonPages) {
      expect(routes.some((r) => r.path === `/alternatives/${comp.slug}`)).toBe(
        true,
      );
    }
  });

  it("includes all feature pages", () => {
    for (const feat of featurePages) {
      expect(routes.some((r) => r.path === `/features/${feat.slug}`)).toBe(
        true,
      );
    }
  });

  it("sets lastModified dates for all routes", () => {
    for (const route of routes) {
      expect(route.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
