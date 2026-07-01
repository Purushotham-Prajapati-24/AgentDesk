import type { Metadata } from "next";

/**
 * Blog layout — passthrough wrapper so every /blog/* route inherits indexable
 * metadata defaults. Individual posts override via generateMetadata.
 */
export const metadata: Metadata = {
  title: "Blog — AI Support Agent Insights",
  description:
    "Deep dives on RAG chatbots, AI customer support, human handoff, and the tools shaping support automation in 2026.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "AgentDesk Blog — AI Support Agent Insights",
    description:
      "Deep dives on RAG chatbots, AI customer support, human handoff, and the tools shaping support automation.",
    url: "/blog",
  },
  robots: { index: true, follow: true },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
