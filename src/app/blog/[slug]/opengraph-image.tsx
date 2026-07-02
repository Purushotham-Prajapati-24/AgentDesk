import { ImageResponse } from "next/og";
import { blogPosts } from "@/lib/content";
import { ogImageResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-image";

export { OG_SIZE as size, OG_CONTENT_TYPE as contentType };

export function generateImageMetadata() {
  return blogPosts.map((post) => ({
    id: post.slug,
    alt: `${post.title} · AgentDesk Blog`,
    size: OG_SIZE,
    contentType: OG_CONTENT_TYPE,
  }));
}

export default async function OgImage({
  id,
}: {
  id: Promise<string>;
}) {
  const slug = await id;
  const post = blogPosts.find((p) => p.slug === slug);
  return ogImageResponse(
    post?.title ?? "Blog Post",
    post?.description,
  );
}
