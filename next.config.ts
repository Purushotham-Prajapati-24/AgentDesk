import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "xlsx", "unpdf", "pdfjs-dist", "jsdom"],
};

export default nextConfig;
