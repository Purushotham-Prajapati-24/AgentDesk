import type { Metadata } from "next";
import Link from "next/link";
import {
  articleSchema,
  breadcrumbSchema,
  personSchema,
} from "@/lib/seo/jsonld";
import {
  AuthorBio,
  ContentLayout,
  RelatedGuides,
  Tldr,
} from "@/components/content/ContentLayout";
import { FaqSection } from "@/components/content/FaqSection";
import { blogPosts, getBlogPost } from "@/lib/content";

/**
 * /blog/[slug] — renders a single MDX blog post.
 *
 * Uses dynamic import of the MDX file so the route is statically generated at
 * build time (generateStaticParams + dynamicParams = false). The MDX body lands
 * in the initial HTML for crawlers; ContentLayout provides the chrome + E-E-A-T
 * signals; JSON-LD (Breadcrumb + Article + Person) makes it machine-readable.
 */

/** Static, known slugs — no filesystem globbing needed. */
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

type Params = { slug: string };

/** Per-post metadata from the content manifest. */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug)!;

  // Dynamic import of the MDX body — statically analyzed at build time.
  const { default: Post, frontmatter } = await import(`@/content/blog/${slug}.mdx`);

  // Related posts — same cluster first, then fill from the rest.
  const related = blogPosts
    .filter((p) => p.slug !== slug)
    .sort((a, b) => {
      const aCluster = a.cluster === post.cluster ? 0 : 1;
      const bCluster = b.cluster === post.cluster ? 0 : 1;
      return aCluster - bCluster;
    })
    .slice(0, 4)
    .map((p) => ({
      title: p.title,
      href: `/blog/${p.slug}`,
      description: p.excerpt,
    }));

  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    articleSchema({
      headline: post.title,
      description: post.description,
      path: `/blog/${post.slug}`,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      authorName: post.author,
    }),
    personSchema({
      name: post.author,
      jobTitle: "AgentDesk Engineering",
      url: "https://github.com/Purushotham-Prajapati-24/AgentDesk",
    }),
  ];

  return (
    <>
      <ContentLayout
        title={post.title}
        subtitle={post.excerpt}
        eyebrow={post.category}
        lastUpdated={post.dateModified ?? post.datePublished}
        author={post.author}
        readingTime={post.readingTime}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
      >
        {frontmatter?.tldr ? <Tldr>{frontmatter.tldr}</Tldr> : null}

        {/* The MDX body — server-rendered into the initial HTML. */}
        <Post />

        {frontmatter?.faqs?.length ? (
          <FaqSection faqs={frontmatter.faqs} />
        ) : null}

        <AuthorBio name={post.author} role="AgentDesk Engineering" />

        {/* Internal-linking block: every post surfaces ≥3 sibling links. */}
        <RelatedGuides links={related} title="Keep reading" />

        <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/8 p-5 text-center">
          <p className="text-sm font-medium leading-6 text-[var(--ui-text)]">
            Want this in production?{" "}
            <Link
              href="/ai-support-agent"
              className="font-semibold text-[#0099ff] underline-offset-2 hover:underline"
            >
              Explore the AgentDesk AI support agent
            </Link>{" "}
            or{" "}
            <Link
              href="/docs"
              className="font-semibold text-[#0099ff] underline-offset-2 hover:underline"
            >
              read the developer docs
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
