type EmbedPageProps = {
  params: Promise<{
    botId: string;
  }>;
  searchParams: Promise<{
    theme?: string;
    position?: string;
    className?: string;
    cspNonce?: string;
  }>;
};

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { botId } = await params;
  const { theme, position, className, cspNonce } = await searchParams;
  const safeBotId = /^[a-zA-Z0-9_-]{3,80}$/.test(botId) ? botId : "";

  // Sanitize parameter inputs to match expected formats
  const cleanTheme = theme && /^[a-zA-Z0-9._-]+$/.test(theme) ? theme : undefined;
  const cleanPosition = position && ["bottom-right", "bottom-left", "top-right", "top-left"].includes(position) ? position : undefined;
  const cleanClassName = className && /^[a-zA-Z0-9\s_-]+$/.test(className) ? className : undefined;
  const cleanCspNonce = cspNonce && /^[a-zA-Z0-9+/=_-]+$/.test(cspNonce) ? cspNonce : undefined;

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
          Invalid widget configuration.
        </div>
      )}
    </main>
  );
}
