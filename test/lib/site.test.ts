import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://agentdeskbot.vercel.app";
});

const { absoluteUrl, SITE_URL } = await import("../../src/lib/site");

describe("SITE_URL", () => {
  it("uses the NEXT_PUBLIC_SITE_URL env var", () => {
    expect(SITE_URL).toBe("https://agentdeskbot.vercel.app");
  });

  it("prepends https protocol on Vercel preview bare domain names", async () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const originalVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
    
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_URL = "preview-deployment-url.vercel.app";

    // @ts-expect-error - Vitest query param to force module reload is not recognized by tsc
    const { SITE_URL: vercelPreviewUrl } = await import("../../src/lib/site?test=vercel-preview");

    expect(vercelPreviewUrl).toBe("https://preview-deployment-url.vercel.app");

    // Restore env
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    process.env.NEXT_PUBLIC_VERCEL_URL = originalVercelUrl;
  });
});

describe("absoluteUrl", () => {
  it("joins a path onto SITE_URL", () => {
    expect(absoluteUrl("/docs")).toBe("https://agentdeskbot.vercel.app/docs");
  });

  it("handles paths without leading slash", () => {
    expect(absoluteUrl("docs")).toBe("https://agentdeskbot.vercel.app/docs");
  });

  it("returns the root URL for default path", () => {
    expect(absoluteUrl("/")).toBe("https://agentdeskbot.vercel.app/");
  });

  it("prepends leading slash when missing", () => {
    expect(absoluteUrl("")).toBe("https://agentdeskbot.vercel.app/");
  });
});
