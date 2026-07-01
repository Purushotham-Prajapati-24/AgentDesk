import type { Metadata } from "next";
import Link from "next/link";
import {
  articleSchema,
  breadcrumbSchema,
  techArticleSchema,
} from "@/lib/seo/jsonld";
import {
  ContentLayout,
  RelatedGuides,
} from "@/components/content/ContentLayout";
import { docPages, getDocPage } from "@/lib/content";

/**
 * /docs/[slug] — renders a single MDX documentation page.
 *
 * Dynamic import of the MDX file, statically prerendered at build time via
 * generateStaticParams. The existing /docs/page.tsx (the docs hub) takes
 * priority for the literal /docs route; this route handles /docs/quickstart,
 * /docs/embed-widget, etc.
 *
 * Each doc page gets: ContentLayout chrome, breadcrumb, TechArticle JSON-LD,
 * and a RelatedGuides block linking to sibling docs (work item 2.11).
 */

export function generateStaticParams() {
  return docPages.map((doc) => ({ slug: doc.slug }));
}

export const dynamicParams = false;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocPage(slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/docs/${doc.slug}` },
    openGraph: {
      type: "article",
      title: doc.title,
      description: doc.description,
      url: `/docs/${doc.slug}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const doc = getDocPage(slug)!;

  // Dynamic import of the MDX body.
  const { default: Content } = await import(`@/content/docs/${slug}.mdx`);

  // Related docs — same category first, then fill from the rest.
  const related = docPages
    .filter((d) => d.slug !== slug)
    .sort((a, b) => {
      const aCat = a.category === doc.category ? 0 : 1;
      const bCat = b.category === doc.category ? 0 : 1;
      return aCat - bCat;
    })
    .slice(0, 4)
    .map((d) => ({
      title: d.title,
      href: `/docs/${d.slug}`,
      description: d.excerpt,
    }));

  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Docs", path: "/docs" },
      { name: doc.title, path: `/docs/${doc.slug}` },
    ]),
    techArticleSchema({
      headline: doc.title,
      description: doc.description,
      path: `/docs/${doc.slug}`,
      datePublished: doc.datePublished,
    }),
  ];

  return (
    <>
      <ContentLayout
        title={doc.title}
        subtitle={doc.excerpt}
        eyebrow={`Docs · ${doc.category}`}
        lastUpdated={doc.datePublished}
        readingTime={doc.readingTime}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Docs", href: "/docs" },
          { label: doc.title, href: `/docs/${doc.slug}` },
        ]}
      >
        <Content />

        <RelatedGuides links={related} title="Related docs" />

        <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/8 p-5 text-center">
          <p className="text-sm font-medium leading-6 text-[var(--ui-text)]">
            Questions about this doc?{" "}
            <Link
              href="/docs"
              className="font-semibold text-[#0099ff] underline-offset-2 hover:underline"
            >
              Browse all docs
            </Link>{" "}
            or{" "}
            <Link
              href="/ai-support-agent"
              className="font-semibold text-[#0099ff] underline-offset-2 hover:underline"
            >
              explore the AI support agent
            </Link>
            .
          </p>
        </div>
      </ContentLayout>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
