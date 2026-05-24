type EmbedPageProps = {
  params: Promise<{
    botId: string;
  }>;
};

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { botId } = await params;
  const safeBotId = /^[a-zA-Z0-9_-]{3,80}$/.test(botId) ? botId : "";

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      {safeBotId ? (
        <script src="/widget.js" data-bot-id={safeBotId} data-mode="inline" async />
      ) : (
        <div className="flex h-screen items-center justify-center px-6 text-center text-sm font-bold text-muted-foreground">
          Invalid widget configuration.
        </div>
      )}
    </main>
  );
}
