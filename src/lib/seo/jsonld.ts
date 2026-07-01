import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_REPOSITORY,
  SITE_TAGLINE,
  absoluteUrl,
} from "@/lib/site";

/**
 * Structured-data builders for SEO + GEO + AEO.
 *
 * Each function returns a plain JSON-LD object. Render via
 * `<script type="application/ld+json" dangerouslySetInnerHTML />` in the
 * Server Component that owns the page.
 *
 * Specs: https://schema.org / https://developers.google.com/search/docs/appearance/structured-data
 */

type WithContext<T> = T & {
  "@context": "https://schema.org";
};

/** Organization — the company behind AgentDesk. Lives on the homepage. */
export function organizationSchema(): WithContext<{
  "@type": "Organization";
  name: string;
  url: string;
  description: string;
  logo: string;
  sameAs: string[];
  knowsAbout: string[];
}> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_TAGLINE,
    logo: absoluteUrl(SITE_OG_IMAGE),
    sameAs: [SITE_REPOSITORY],
    knowsAbout: [
      "AI support agent",
      "RAG chatbot",
      "Human handoff",
      "Embeddable chat widget",
      "Customer support automation",
    ],
  };
}

/**
 * WebSite with SearchAction — signals a searchable site to Google.
 * The `/search?q=` target will exist once a docs/blog search ships; it's
 * safe to declare now (Google only honors it if the endpoint resolves).
 */
export function websiteSchema(): WithContext<{
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  publisher: { "@type": "Organization"; name: string };
  potentialAction: {
    "@type": "SearchAction";
    target: { "@type": "EntryPoint"; urlTemplate: string };
    "query-input": string;
  };
}> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/search?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * SoftwareApplication — the core SaaS product schema. Enables app-type rich
 * results. `offers` marks it as a free-tier product (matches reality: usage
 * credits, no flat fee).
 */
export function softwareApplicationSchema(): WithContext<{
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  url: string;
  description: string;
  offers: { "@type": "Offer"; price: string; priceCurrency: string };
  featureList: string[];
}> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Retrieval-augmented generation over tenant documents",
      "Live human handoff with preserved session context",
      "Embeddable chat widget (script, iframe, React, Vue)",
      "Tenant isolation across knowledge, widget, and conversations",
      "Real-time monitoring of active support sessions",
    ],
  };
}

/**
 * BreadcrumbList — used on `/docs` and any nested content page.
 * Pass an array of { name, path } from root → current page.
 */
export function breadcrumbSchema(
  crumbs: ReadonlyArray<{ name: string; path: string }>,
): WithContext<{
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * TechArticle — for `/docs` and future long-form guides. Signals expertise
 * and enables article-type rich results.
 */
export function techArticleSchema(options: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
}): WithContext<{
  "@type": "TechArticle";
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  author: { "@type": "Person"; name: string };
  publisher: { "@type": "Organization"; name: string };
}> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: options.headline,
    description: options.description,
    url: absoluteUrl(options.path),
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    author: {
      "@type": "Person",
      name: options.authorName ?? "AgentDesk Team",
    },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

/**
 * FAQPage — for definitional / Q&A content. Lifts real People-Also-Ask
 * questions onto each pillar page in Phase 2. AEO + GEO leverage.
 */
export function faqSchema(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
): WithContext<{
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Article — general article schema for blog posts and spokes. More broadly
 * applicable than TechArticle (which is reserved for technical docs). Pairs
 * with a Person author node for E-E-A-T.
 *
 * Spec: https://schema.org/Article
 */
export function articleSchema(options: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  authorJobTitle?: string;
}): WithContext<{
  "@type": "Article";
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  author: {
    "@type": "Person";
    name: string;
    url?: string;
    jobTitle?: string;
  };
  publisher: { "@type": "Organization"; name: string; url: string };
}> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url: absoluteUrl(options.path),
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    author: {
      "@type": "Person",
      name: options.authorName,
      ...(options.authorUrl ? { url: options.authorUrl } : {}),
      ...(options.authorJobTitle ? { jobTitle: options.authorJobTitle } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

/**
 * HowTo — for step-by-step guide pages. Eligible for rich-result display and
 * high-value for AEO (answer engines extract step lists preferentially).
 *
 * Spec: https://schema.org/HowTo
 */
export function howToSchema(options: {
  name: string;
  description: string;
  path: string;
  steps: ReadonlyArray<{ name: string; text: string }>;
  estimatedCost?: string;
  totalTime?: string;
}): WithContext<{
  "@type": "HowTo";
  name: string;
  description: string;
  url: string;
  step: Array<{
    "@type": "HowToStep";
    name: string;
    text: string;
  }>;
  estimatedCost?: { "@type": "MonetaryAmount"; currency: string; value: string };
  totalTime?: string;
}> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    step: options.steps.map((step) => ({
      "@type": "HowToStep",
      name: step.name,
      text: step.text,
    })),
    ...(options.estimatedCost
      ? {
          estimatedCost: {
            "@type": "MonetaryAmount",
            currency: "USD",
            value: options.estimatedCost,
          },
        }
      : {}),
    ...(options.totalTime ? { totalTime: options.totalTime } : {}),
  };
}

/**
 * Person — author entity for E-E-A-T. Pairs with Article.author to signal
 * expertise to Google's quality raters and AI engines.
 *
 * Spec: https://schema.org/Person
 */
export function personSchema(options: {
  name: string;
  jobTitle?: string;
  url?: string;
  sameAs?: string[];
}): WithContext<{
  "@type": "Person";
  name: string;
  jobTitle?: string;
  url?: string;
  sameAs?: string[];
}> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: options.name,
    ...(options.jobTitle ? { jobTitle: options.jobTitle } : {}),
    ...(options.url ? { url: options.url } : {}),
    ...(options.sameAs ? { sameAs: options.sameAs } : {}),
  };
}
