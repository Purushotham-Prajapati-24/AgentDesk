type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type StreamToken = {
  content: string;
  totalTokens?: number;
};

type Provider = {
  name: string;
  available: () => boolean;
  stream: (messages: ChatMessage[], signal: AbortSignal) => AsyncGenerator<StreamToken>;
};

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
};

type GeminiStreamChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
};

const DEFAULT_PROVIDER_ORDER = ["groq", "openai", "gemini"];

export function streamCompletionWithFallback({
  system,
  user,
  fallbackMessage,
  onToken,
  onComplete,
}: {
  system: string;
  user: string;
  fallbackMessage: string;
  onToken: (token: string) => void;
  onComplete: (content: string, tokenCount: number, providerName: string) => void;
}) {
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  return runFallbackChain(messages, fallbackMessage, user, onToken, onComplete);
}

async function runFallbackChain(
  messages: ChatMessage[],
  fallbackMessage: string,
  userMessage: string,
  onToken: (token: string) => void,
  onComplete: (content: string, tokenCount: number, providerName: string) => void,
) {
  const providers = providerOrder();
  let lastError = "";

  for (const provider of providers) {
    if (!provider.available()) {
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), numberEnv("LLM_PROVIDER_TIMEOUT_MS", 18000));
    let content = "";
    let tokenCount = 0;

    try {
      for await (const token of provider.stream(messages, controller.signal)) {
        content += token.content;
        tokenCount = token.totalTokens ?? estimateTokens(content) + estimateTokens(userMessage);
        if (token.content) {
          onToken(token.content);
        }
      }

      clearTimeout(timeout);
      if (!content.trim()) {
        throw new Error(`${provider.name} returned empty content.`);
      }

      const finalTokenCount = tokenCount || estimateTokens(content) + estimateTokens(userMessage);
      onComplete(content, finalTokenCount, provider.name);
      return;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error.message : `${provider.name} failed.`;
      console.error("LLM provider failed:", provider.name, lastError);
    }
  }

  onToken(fallbackMessage);
  onComplete(fallbackMessage, estimateTokens(fallbackMessage) + estimateTokens(userMessage), "static");
}

function providerOrder() {
  const registry = new Map<string, Provider>([
    ["groq", groqProvider()],
    ["openai", openAiCompatibleProvider()],
    ["gemini", geminiProvider()],
  ]);

  return (process.env.LLM_PROVIDER_ORDER ?? DEFAULT_PROVIDER_ORDER.join(","))
    .split(",")
    .map((name) => registry.get(name.trim().toLowerCase()))
    .filter((provider): provider is Provider => Boolean(provider));
}

function groqProvider(): Provider {
  return {
    name: "groq",
    available: () => Boolean(process.env.GROQ_API_KEY),
    stream: (messages, signal) =>
      openAiCompatibleStream({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY ?? "",
        model: process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile",
        messages,
        signal,
      }),
  };
}

function openAiCompatibleProvider(): Provider {
  return {
    name: "openai",
    available: () => Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_COMPAT_API_KEY),
    stream: (messages, signal) =>
      openAiCompatibleStream({
        url: process.env.OPENAI_COMPAT_CHAT_URL ?? "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_COMPAT_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
        model: process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_COMPAT_CHAT_MODEL ?? "gpt-4.1-mini",
        messages,
        signal,
      }),
  };
}

function geminiProvider(): Provider {
  return {
    name: "gemini",
    available: () => Boolean(process.env.GEMINI_API_KEY),
    stream: (messages, signal) => geminiStream(messages, signal),
  };
}

async function* openAiCompatibleStream({
  url,
  apiKey,
  model,
  messages,
  signal,
}: {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Completion request failed.");
  }

  yield* readOpenAiStream(response.body);
}

async function* geminiStream(messages: ChatMessage[], signal: AbortSignal) {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const model = process.env.GEMINI_CHAT_MODEL ?? "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: messages.find((message) => message.role === "system")?.content ?? "" }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: messages.find((message) => message.role === "user")?.content ?? "" }],
        },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Gemini completion request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const read = await reader.read();
    if (read.done) {
      break;
    }

    buffer += decoder.decode(read.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      const chunk = JSON.parse(data) as GeminiStreamChunk;
      yield {
        content: chunk.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "",
        totalTokens: chunk.usageMetadata?.totalTokenCount,
      };
    }
  }
}

async function* readOpenAiStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const read = await reader.read();
    if (read.done) {
      break;
    }

    buffer += decoder.decode(read.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      const chunk = JSON.parse(data) as OpenAIStreamChunk;
      yield {
        content: chunk.choices?.[0]?.delta?.content ?? "",
        totalTokens: chunk.usage?.total_tokens,
      };
    }
  }
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function numberEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
