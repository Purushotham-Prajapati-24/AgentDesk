export function getClientWebSocketUrl() {
  return normalizeWebSocketUrl(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
}

export function normalizeWebSocketUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      return null;
    }

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
