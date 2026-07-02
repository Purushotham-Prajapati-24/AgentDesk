import { ImageResponse } from "next/og";

/**
 * Shared OG image template for all content pages.
 *
 * Renders a brand gradient background with title, tagline, and accent bar.
 * Call from any route-level opengraph-image.tsx.
 *
 * Usage:
 *   export default function OgImage() {
 *     return ogImageResponse("My Page Title", "Optional subtitle");
 *   }
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export function ogImageResponse(
  title: string,
  subtitle?: string,
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background:
            "linear-gradient(160deg, #090909 0%, #0b1220 40%, #111827 100%)",
          color: "#f8fbff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 48,
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg, #1456f0, #0099ff)",
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          AgentDesk
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            lineHeight: 1.2,
            marginTop: 8,
            color: "#c8d4df",
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 20,
              fontWeight: 400,
              lineHeight: 1.5,
              marginTop: 16,
              color: "#8bd8ff",
              maxWidth: 800,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
          }}
        >
          {["RAG Verified", "Human Handoff", "Embeddable Widget"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "1px solid rgba(0, 153, 255, 0.3)",
                  background: "rgba(0, 153, 255, 0.1)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#8bd8ff",
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
