import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://agentdeskbot.vercel.app";
});

const {
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
  breadcrumbSchema,
  techArticleSchema,
  faqSchema,
  articleSchema,
  howToSchema,
  personSchema,
} = await import("../../src/lib/seo/jsonld");

describe("organizationSchema", () => {
  const org = organizationSchema();

  it("has the correct @context", () => {
    expect(org["@context"]).toBe("https://schema.org");
  });

  it("has the correct @type", () => {
    expect(org["@type"]).toBe("Organization");
  });

  it("includes required fields", () => {
    expect(org.name).toBeTruthy();
    expect(org.url).toContain("agentdeskbot.vercel.app");
    expect(org.description).toBeTruthy();
    expect(org.logo).toContain("/opengraph-image.png");
    expect(org.sameAs).toHaveLength(1);
    expect(org.knowsAbout).toHaveLength(5);
  });
});

describe("websiteSchema", () => {
  const site = websiteSchema();

  it("has the correct @type", () => {
    expect(site["@type"]).toBe("WebSite");
  });

  it("includes potentialAction with SearchAction", () => {
    expect(site.potentialAction["@type"]).toBe("SearchAction");
    expect(site.potentialAction.target.urlTemplate).toContain("/search?q=");
  });
});

describe("softwareApplicationSchema", () => {
  const app = softwareApplicationSchema();

  it("has the correct @type", () => {
    expect(app["@type"]).toBe("SoftwareApplication");
  });

  it("has free pricing", () => {
    expect(app.offers.price).toBe("0");
    expect(app.offers.priceCurrency).toBe("USD");
  });

  it("includes feature list", () => {
    expect(app.featureList.length).toBeGreaterThanOrEqual(5);
  });
});

describe("breadcrumbSchema", () => {
  it("creates correct list items with positions", () => {
    const crumbs = [
      { name: "Home", path: "/" },
      { name: "Docs", path: "/docs" },
    ];
    const result = breadcrumbSchema(crumbs);

    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[0].name).toBe("Home");
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[1].name).toBe("Docs");
  });
});

describe("techArticleSchema", () => {
  const article = techArticleSchema({
    headline: "Test Article",
    description: "A test description",
    path: "/docs/test",
    datePublished: "2026-07-01",
  });

  it("has the correct @type", () => {
    expect(article["@type"]).toBe("TechArticle");
  });

  it("defaults dateModified to datePublished when not provided", () => {
    expect(article.dateModified).toBe(article.datePublished);
  });

  it("defaults author name", () => {
    expect(article.author.name).toBe("AgentDesk Team");
  });

  it("builds absolute URL", () => {
    expect(article.url).toContain("/docs/test");
  });
});

describe("faqSchema", () => {
  it("transforms Q&A pairs into Question entities", () => {
    const faqs = [
      { question: "What is RAG?", answer: "Retrieval-augmented generation." },
    ];
    const result = faqSchema(faqs);

    expect(result["@type"]).toBe("FAQPage");
    expect(result.mainEntity).toHaveLength(1);
    expect(result.mainEntity[0]["@type"]).toBe("Question");
    expect(result.mainEntity[0].name).toBe("What is RAG?");
    expect(result.mainEntity[0].acceptedAnswer.text).toBe(
      "Retrieval-augmented generation.",
    );
  });
});

describe("articleSchema", () => {
  it("builds an Article with author and publisher", () => {
    const article = articleSchema({
      headline: "Blog Post",
      description: "A blog post",
      path: "/blog/test",
      datePublished: "2026-07-01",
      authorName: "Test Author",
    });

    expect(article["@type"]).toBe("Article");
    expect(article.author.name).toBe("Test Author");
    expect(article.publisher["@type"]).toBe("Organization");
    expect(article.publisher.url).toContain("agentdeskbot.vercel.app");
  });

  it("includes optional author metadata when provided", () => {
    const article = articleSchema({
      headline: "Post",
      description: "Desc",
      path: "/blog/test",
      datePublished: "2026-07-01",
      authorName: "Author",
      authorUrl: "https://example.com/author",
      authorJobTitle: "Engineer",
    });

    expect(article.author.url).toBe("https://example.com/author");
    expect(article.author.jobTitle).toBe("Engineer");
  });
});

describe("howToSchema", () => {
  it("builds HowTo with steps", () => {
    const steps = [
      { name: "Step 1", text: "Do something" },
      { name: "Step 2", text: "Do something else" },
    ];
    const result = howToSchema({
      name: "Guide",
      description: "A guide",
      path: "/docs/guide",
      steps,
    });

    expect(result["@type"]).toBe("HowTo");
    expect(result.step).toHaveLength(2);
    expect(result.step[0]["@type"]).toBe("HowToStep");
  });

  it("includes optional time and cost fields", () => {
    const result = howToSchema({
      name: "Guide",
      description: "Desc",
      path: "/docs/guide",
      steps: [{ name: "S1", text: "T1" }],
      estimatedCost: "0",
      totalTime: "PT30M",
    });

    expect(result.estimatedCost).toBeDefined();
    expect(result.totalTime).toBe("PT30M");
  });
});

describe("personSchema", () => {
  it("builds a Person with required name", () => {
    const person = personSchema({ name: "Test User" });
    expect(person["@type"]).toBe("Person");
    expect(person.name).toBe("Test User");
  });

  it("includes optional fields", () => {
    const person = personSchema({
      name: "Test User",
      jobTitle: "Engineer",
      url: "https://example.com",
      sameAs: ["https://github.com/test"],
    });

    expect(person.jobTitle).toBe("Engineer");
    expect(person.url).toBe("https://example.com");
    expect(person.sameAs).toHaveLength(1);
  });
});
