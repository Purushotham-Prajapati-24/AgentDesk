import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://agentdeskbot.vercel.app";
});

const { absoluteUrl, SITE_URL } = await import("../../src/lib/site");

describe("SITE_URL", () => {
  it("uses the NEXT_PUBLIC_SITE_URL env var", () => {
    expect(SITE_URL).toBe("https://agentdeskbot.vercel.app");
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
