import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — same brand mark at 180×180. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "22%",
          background: "linear-gradient(135deg, #1456f0 0%, #0099ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.9 19.1C1.7 15.9 1.7 10.7 4.9 7.5" />
          <path d="M7.8 16.2c-1.8-1.8-1.8-4.6 0-6.4" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 9.8c1.8 1.8 1.8 4.6 0 6.4" />
          <path d="M19.1 7.5c3.2 3.2 3.2 8.4 0 11.6" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
