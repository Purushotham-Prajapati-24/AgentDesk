import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans, Fira_Code, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_LOCALE,
  siteOrigin,
} from "@/lib/site";
import {
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
} from "@/lib/seo/jsonld";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
});

/**
 * Root metadata — sets the metadataBase so every relative URL field across
 * the app resolves to an absolute canonical URL. Child segments inherit
 * these defaults and override per-route via their own `metadata` export.
 */
export const metadata: Metadata = {
  metadataBase: siteOrigin,
  title: {
    default: `${SITE_NAME} — AI Support Agent with Verified Answers & Human Handoff`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "AI support agent",
    "RAG chatbot",
    "AI customer support",
    "human handoff",
    "live agent takeover",
    "embeddable chat widget",
    "Chatbase alternative",
    "DocsBot alternative",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI Support Agent with Verified Answers & Human Handoff`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — AI support agent with verified answers and human handoff`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI Support Agent with Human Handoff`,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

/**
 * Viewport config — `themeColor` and `colorScheme` moved here from metadata
 * in Next.js 14+ (see generate-viewport doc).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090909" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} ${plusJakartaSans.variable} ${firaCode.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col safe-padding">
        <Providers>{children}</Providers>
        {/* Sitewide structured data — Organization + WebSite + SoftwareApplication.
            Page-level JSON-LD (TechArticle, FAQPage) is rendered in each page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationSchema(),
              websiteSchema(),
              softwareApplicationSchema(),
            ]),
          }}
        />
      </body>
    </html>
  );
}
