import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Allow .md / .mdx files to act as pages, routes, or imports.
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  serverExternalPackages: ["mammoth", "xlsx", "unpdf", "pdfjs-dist"],
};

const withMDX = createMDX({
  // Use string plugin names so this works with both Turbopack and webpack
  // (function plugins aren't serializable for Turbopack per Next 16 MDX guide).
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

// Merge MDX config with Next.js config.
export default withMDX(nextConfig);
