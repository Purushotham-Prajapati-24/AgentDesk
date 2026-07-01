import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** Route metadata for OG image generation. */
export const alt = `${SITE_NAME} — AI Support Agent with Verified Answers & Human Handoff`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default Open Graph image — 1200×630 for link previews on X, LinkedIn,
 * Slack, Discord, and Facebook. Rendered server-side at build time.
 */
export default function OpenGraphImage() {
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
          background: "linear-gradient(160deg, #090909 0%, #0b1220 40%, #111827 100%)",
          color: "#f8fbff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: 48,
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg, #1456f0, #0099ff)",
            marginBottom: 24,
          }}
        />
        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          {SITE_NAME}
        </div>
        {/* Tagline */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            lineHeight: 1.5,
            marginTop: 16,
            color: "#c8d4df",
            maxWidth: 900,
          }}
        >
          {SITE_TAGLINE}
        </div>
        {/* Badge row */}
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
    { ...size },
  );
}
