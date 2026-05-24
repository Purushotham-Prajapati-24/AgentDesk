export function getServerWebSocketUrl() {
  return normalizeServerWebSocketUrl(process.env.WEBSOCKET_URL) ?? normalizeServerWebSocketUrl(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
}

export function getPublicServerWebSocketUrl() {
  return normalizeServerWebSocketUrl(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
}

function normalizeServerWebSocketUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      return null;
    }

    url.protocol = url.protocol === "ws:" ? "http:" : url.protocol === "wss:" ? "https:" : url.protocol;
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
