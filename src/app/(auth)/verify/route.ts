import { verifyMagicLink } from "@/app/auth-actions";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return redirectToLogin(request, "invalid_magic_link", 303);
  }

  return new NextResponse(renderVerificationPage(userId, secret), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = stringValue(formData.get("userId"));
  const secret = stringValue(formData.get("secret"));

  if (!userId || !secret) {
    return redirectToLogin(request, "invalid_magic_link");
  }

  const result = await verifyMagicLink(userId, secret);
  if (!result.success) {
    console.error("Magic link verification failed:", result.error);
    return redirectToLogin(request, "verification_failed", 303);
  }

  return NextResponse.redirect(new URL("/inbox", request.url), 303);
}

function redirectToLogin(request: NextRequest, error: string, status = 307) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, status);
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderVerificationPage(userId: string, secret: string) {
  const escapedUserId = escapeHtml(userId);
  const escapedSecret = escapeHtml(secret);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify sign in</title>
    <style>
      :root {
        color-scheme: light;
        --background: #f7f4ed;
        --surface: #fcfbf8;
        --border: #eceae4;
        --text: #1c1c1c;
        --muted: #5f5f5d;
        --primary: #1c1c1c;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--background);
        color: var(--text);
        font-family: Inter, Arial, Helvetica, sans-serif;
      }

      main {
        width: min(100%, 460px);
        border: 1px solid var(--border);
        background: var(--surface);
        padding: 28px;
      }

      h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
      }

      p {
        margin: 14px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      button {
        width: 100%;
        min-height: 48px;
        margin-top: 24px;
        border: 0;
        border-radius: 6px;
        background: var(--primary);
        color: #fcfbf8;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        box-shadow: rgba(255,255,255,0.2) 0px 0.5px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Verify sign in</h1>
      <p>Continue to complete your one-time Appwrite session verification.</p>
      <form method="post" action="/verify">
        <input type="hidden" name="userId" value="${escapedUserId}" />
        <input type="hidden" name="secret" value="${escapedSecret}" />
        <button type="submit">Continue to workspace</button>
      </form>
    </main>
  </body>
</html>`;
}
