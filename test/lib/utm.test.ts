import { describe, it, expect } from "vitest";
import { trackedUrl, trackedDocLink, trackedBlogLink } from "../../src/lib/utm";

describe("utm tracking utilities", () => {
  describe("trackedUrl", () => {
    it("appends required utm_source and utm_medium defaults", () => {
      const url = "https://example.com";
      const result = trackedUrl(url, { source: "campaign1" });
      
      const parsed = new URL(result);
      expect(parsed.searchParams.get("utm_source")).toBe("campaign1");
      expect(parsed.searchParams.get("utm_medium")).toBe("referral");
    });

    it("appends optional utm parameters (campaign, term, content)", () => {
      const url = "https://example.com";
      const result = trackedUrl(url, {
        source: "agentdesk",
        medium: "email",
        campaign: "newsletter-july",
        term: "ai-support",
        content: "banner-ad",
      });

      const parsed = new URL(result);
      expect(parsed.searchParams.get("utm_source")).toBe("agentdesk");
      expect(parsed.searchParams.get("utm_medium")).toBe("email");
      expect(parsed.searchParams.get("utm_campaign")).toBe("newsletter-july");
      expect(parsed.searchParams.get("utm_term")).toBe("ai-support");
      expect(parsed.searchParams.get("utm_content")).toBe("banner-ad");
    });

    it("correctly handles pre-existing query parameters in the base URL", () => {
      const url = "https://example.com/search?q=chatbot";
      const result = trackedUrl(url, { source: "docs" });

      const parsed = new URL(result);
      expect(parsed.searchParams.get("q")).toBe("chatbot");
      expect(parsed.searchParams.get("utm_source")).toBe("docs");
      expect(parsed.searchParams.get("utm_medium")).toBe("referral");
    });

    it("handles relative path URLs correctly by using string composition check", () => {
      const url = "/docs/handoff-api";
      const result = trackedUrl(url, { source: "button" });

      expect(result).toContain("/docs/handoff-api?utm_source=button&utm_medium=referral");
    });
  });

  describe("trackedDocLink", () => {
    it("constructs an organic doc link with doc-specific campaign tag", () => {
      const result = trackedDocLink("https://github.com", "quickstart");
      const parsed = new URL(result);
      
      expect(parsed.searchParams.get("utm_source")).toBe("agentdesk");
      expect(parsed.searchParams.get("utm_medium")).toBe("docs");
      expect(parsed.searchParams.get("utm_campaign")).toBe("quickstart");
    });
  });

  describe("trackedBlogLink", () => {
    it("constructs an organic blog link with blog-specific campaign tag", () => {
      const result = trackedBlogLink("https://github.com", "why-ai-human-blend-wins");
      const parsed = new URL(result);
      
      expect(parsed.searchParams.get("utm_source")).toBe("agentdesk");
      expect(parsed.searchParams.get("utm_medium")).toBe("blog");
      expect(parsed.searchParams.get("utm_campaign")).toBe("why-ai-human-blend-wins");
    });
  });
});
