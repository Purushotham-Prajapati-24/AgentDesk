import { headers } from "next/headers";

type EmbedPageProps = {
  params: Promise<{
    botId: string;
  }>;
  searchParams: Promise<{
    theme?: string;
    position?: string;
    className?: string;
    // NOTE: cspNonce is intentionally NOT accepted as a query parameter.
    // Transmitting a nonce in a URL violates the CSP nonce threat model:
    // query strings are recorded in access logs, browser history, and
    // Referer headers, which would expose the nonce to third parties and
    // render it meaningless.  The nonce MUST be injected by middleware via
    // the x-nonce response header.  Any ?cspNonce=... in the URL is ignored.
  }>;
};

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { botId } = await params;
  const { theme, position, className } = await searchParams;
  const safeBotId = /^[a-zA-Z0-9_-]{3,80}$/.test(botId) ? botId : "";

  // Sanitize parameter inputs to match expected formats
  const cleanTheme = theme && /^[a-zA-Z0-9._-]+$/.test(theme) ? theme : undefined;
  const cleanPosition = position && ["bottom-right", "bottom-left", "top-right", "top-left"].includes(position) ? position : undefined;

  // Split on whitespace and validate each class name token individually to allow multi-class safely
  const cleanClassName = className
    ? className
      .split(/\s+/)
      .filter((token) => /^[a-zA-Z0-9_-]+$/.test(token))
      .join(" ") || undefined
    : undefined;

  // Retrieve CSP nonce from the x-nonce response header set by Next.js middleware.
  // This is the ONLY accepted delivery path; query-string nonces are deliberately
  // rejected (see the comment in EmbedPageProps.searchParams above).
  const headersList = await headers();
  const nonceHeader = headersList.get("x-nonce") || undefined;
  const cleanCspNonce = nonceHeader && /^[a-zA-Z0-9+/=_-]+$/.test(nonceHeader) ? nonceHeader : undefined;

  return (
    <main className="h-svh w-full overflow-hidden">
      {safeBotId ? (
        <script
          src="/widget.js"
          data-bot-id={safeBotId}
          data-mode="inline"
          data-theme={cleanTheme}
          data-position={cleanPosition}
          data-class-name={cleanClassName}
          data-csp-nonce={cleanCspNonce}
          nonce={cleanCspNonce}
          async
        />
      ) : (
        <div className="flex h-screen items-center justify-center px-6 text-center text-sm font-bold text-muted-foreground">
