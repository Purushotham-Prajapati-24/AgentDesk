import { Readability } from "@mozilla/readability";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import TurndownService from "turndown";

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const MAX_MARKDOWN_CHARS = 500000;
const MAX_REDIRECTS = 3;
const DEFAULT_ALLOWED_PORTS = new Set(["80", "443"]);

type FetchOptions = {
  headers: Record<string, string>;
  timeoutMs: number;
};

type ResolvedHttpUrl = {
  originalUrl: URL;
  connectHost: string;
  family: 4 | 6;
  hostHeader: string;
  servername?: string;
  /** All vetted IPs for the host (already validated as non-private). Used for connect-level retry. */
  candidates?: Array<{ address: string; family: number }>;
};

type FetchTextTransport = (resolved: ResolvedHttpUrl, options: FetchOptions) => Promise<{
  status: number;
  statusText: string;
  headers: Headers;
  text: string;
}>;

let fetchTextTransport: FetchTextTransport = fetchPinnedText;

export class WebsiteCrawler {
  private readonly turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
    });

    this.turndown.keep(["table", "thead", "tbody", "tr", "td", "th"]);
  }

  async crawl(url: string) {
    const html = await this.fetchPageHtml(url);
    const nextDataText = await this.tryExtractNextData(html);
    if (nextDataText) {
      return nextDataText.slice(0, MAX_MARKDOWN_CHARS);
    }

    return (await this.cleanAndConvertHtml(html, url)).slice(0, MAX_MARKDOWN_CHARS);
  }

  private async fetchPageHtml(url: string) {
    const browserlessKey = process.env.BROWSERLESS_API_KEY;
    if (browserlessKey) {
      await assertAllowedHttpUrl(url);
      const response = await fetch(`https://chrome.browserless.io/content?token=${encodeURIComponent(browserlessKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          waitFor: 2000,
          gotoOptions: { waitUntil: "networkidle2" },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        return (await response.text()).slice(0, MAX_FETCH_BYTES);
      }
    }

    return fetchTextWithEgressGuard(url, {
      headers: {
        Accept: "text/html,text/plain,application/xhtml+xml",
        "User-Agent": "AgentDeskBot/2.0 (like Mozilla; crawling helper)",
      },
      timeoutMs: 10000,
    });
  }

  private async tryExtractNextData(html: string) {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html);
    const nextData = dom.window.document.querySelector<HTMLScriptElement>('script#__NEXT_DATA__[type="application/json"]');
    if (!nextData?.textContent) {
      return null;
    }

    try {
      const parsed = JSON.parse(nextData.textContent) as { props?: { pageProps?: unknown } };
      if (!parsed.props?.pageProps) {
        return null;
      }

      return JSON.stringify(parsed.props.pageProps, null, 2);
    } catch {
      return null;
    }
  }

  private async cleanAndConvertHtml(html: string, url: string) {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    const article = new Readability(document).parse();
    const content = article?.content || document.body?.innerHTML;

    if (!content) {
      throw new Error("No readable content could be parsed from the DOM.");
    }

    return normalizeText(this.turndown.turndown(content));
  }
}

export async function discoverSitemapUrls(url: string, limit = 30) {
  const xml = await fetchTextWithEgressGuard(url, {
    headers: {
      Accept: "application/xml,text/xml,text/plain",
      "User-Agent": "AgentDeskBot/2.0 (like Mozilla; sitemap helper)",
    },
    timeoutMs: 10000,
  });
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(xml, { contentType: "text/xml", url });
  const links = Array.from(dom.window.document.querySelectorAll("loc"))
    .map((node) => normalizeHttpUrl(node.textContent ?? ""))
    .filter((value): value is string => Boolean(value));

  const uniqueLinks = Array.from(new Set(links));
  const settled = await Promise.allSettled(
    uniqueLinks.map((link) => resolveAllowedHttpUrl(link).then(() => link)),
  );

  const allowedLinks = settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
    .slice(0, limit);

  return allowedLinks;
}

export function looksLikeSitemapUrl(url: string) {
  const parsed = new URL(url);
  return parsed.pathname.endsWith(".xml") || parsed.pathname.toLowerCase().includes("sitemap");
}

export function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchTextWithEgressGuard(
  url: string,
  options: FetchOptions,
  redirects = 0,
): Promise<string> {
  const resolved = await resolveAllowedHttpUrl(url);

  // Try the primary record; on a network-level failure (not an HTTP error), rotate
  // through the remaining vetted candidates without re-validating (they are already
  // confirmed non-private from the same lookup batch — TOCTOU mitigation).
  let response: Awaited<ReturnType<FetchTextTransport>>;
  const candidates = resolved.candidates ?? [];
  let lastError: Error | undefined;
  let didRespond = false;

  for (let i = 0; i <= candidates.length; i++) {
    const attempt =
      i === 0
        ? resolved
        : { ...resolved, connectHost: candidates[i - 1].address, family: candidates[i - 1].family as 4 | 6 };
    try {
      response = await fetchTextTransport(attempt, options);
      didRespond = true;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Network-level error — try next candidate, if any.
    }
  }

  if (!didRespond) {
    throw lastError ?? new Error("URL could not be reached.");
  }

  if (isRedirect(response!.status)) {
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("URL redirects too many times.");
    }

    const location = response!.headers.get("location");
    if (!location) {
      throw new Error("URL redirected without a Location header.");
    }

    const redirectUrl = new URL(location, url).toString();
    return fetchTextWithEgressGuard(redirectUrl, options, redirects + 1);
  }

  const ok = response!.status >= 200 && response!.status < 300;
  if (!ok) {
    throw new Error(`URL could not be fetched: ${response!.status} ${response!.statusText}`);
  }

  const contentLength = Number(response!.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FETCH_BYTES) {
    throw new Error("URL content is too large to ingest.");
  }

  return response!.text.slice(0, MAX_FETCH_BYTES);
}

export async function assertAllowedHttpUrl(value: string) {
  await resolveAllowedHttpUrl(value);
}

async function resolveAllowedHttpUrl(value: string): Promise<ResolvedHttpUrl> {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs can be ingested.");
  }

  if (!DEFAULT_ALLOWED_PORTS.has(url.port || defaultPort(url))) {
    throw new Error("Only default HTTP and HTTPS ports can be ingested.");
  }

  const hostname = normalizeHostname(url.hostname);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs cannot be ingested.");
  }

  const literalIp = net.isIP(hostname);
  if (literalIp) {
    if (isPrivateIp(hostname)) {
      throw new Error("Private-network URLs cannot be ingested.");
    }

    return {
      originalUrl: url,
      connectHost: hostname,
      family: literalIp as 4 | 6,
      hostHeader: hostHeader(url),
    };
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Private-network URLs cannot be ingested.");
  }

  const selected = records[0];
  return {
    originalUrl: url,
    connectHost: selected.address,
    family: selected.family as 4 | 6,
    hostHeader: hostHeader(url),
    servername: hostname,
    // All records are already vetted non-private; store them for connect-level retry.
    candidates: records.slice(1),
  };
}

async function fetchPinnedText(resolved: ResolvedHttpUrl, options: FetchOptions) {
  const client = resolved.originalUrl.protocol === "https:" ? https : http;
  const headers = {
    ...options.headers,
    Host: resolved.hostHeader,
  };

  return new Promise<Awaited<ReturnType<FetchTextTransport>>>((resolve, reject) => {
    const request = client.request(
      {
        protocol: resolved.originalUrl.protocol,
        host: resolved.connectHost,
        family: resolved.family,
        port: Number.parseInt(resolved.originalUrl.port || defaultPort(resolved.originalUrl), 10),
        path: `${resolved.originalUrl.pathname}${resolved.originalUrl.search}`,
        method: "GET",
        headers,
        servername: resolved.servername,
        timeout: options.timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_FETCH_BYTES) {
            request.destroy(new Error("URL content is too large to ingest."));
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? "",
            headers: headersFromIncoming(response.headers),
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("URL fetch timed out.")));
    request.on("error", reject);
    request.end();
  });
}

function headersFromIncoming(headers: http.IncomingHttpHeaders) {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(key, item);
      }
    } else if (typeof value === "string") {
      result.set(key, value);
    }
  }
  return result;
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

export function isPrivateIp(address: string) {
  const normalizedAddress = unwrapMappedV6(normalizeHostname(address));
  if (net.isIPv4(normalizedAddress)) {
    const parts = normalizedAddress.split(".");
    if (parts.length !== 4) {
      return true; // Fail-secure on invalid IPv4 dotted-quad lengths
    }
    const [a, b, c, d] = parts.map((part) => Number.parseInt(part, 10));
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) {
      return true; // Fail-secure
    }

    return (
      a === 10 || // Private-Use (10.0.0.0/8)
      a === 127 || // Loopback (127.0.0.0/8)
      (a === 169 && b === 254) || // Link-Local (169.254.0.0/16)
      (a === 172 && b >= 16 && b <= 31) || // Private-Use (172.16.0.0/12)
      (a === 192 && b === 168) || // Private-Use (192.168.0.0/16)
      a === 0 || // Current network (0.0.0.0/8)
      (a === 100 && b >= 64 && b <= 127) || // Shared Address Space / CGNAT (100.64.0.0/10)
      (a === 192 && b === 0 && c === 2) || // Documentation / TEST-NET-1 (192.0.2.0/24)
      (a === 198 && b === 51 && c === 100) || // Documentation / TEST-NET-2 (198.51.100.0/24)
      (a === 203 && b === 0 && c === 113) || // Documentation / TEST-NET-3 (203.0.113.0/24)
      (a === 198 && b >= 18 && b <= 19) || // Benchmarking (198.18.0.0/15)
      a >= 224 // Multicast/Reserved (224.0.0.0/4 and 240.0.0.0/4)
    );
  }

  const normalized = normalizedAddress.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("ff") || // IPv6 Multicast
    /^fe[89ab][0-9a-f]:/.test(normalized) ||
    normalized.startsWith("100:") ||
    normalized.startsWith("64:ff9b:") ||
    /^2001:0{1,4}:/i.test(normalized) || // Teredo prefix
    normalized.startsWith("2001::")
  );
}

function unwrapMappedV6(address: string): string {
  const normalized = address.toLowerCase().trim();

  // 1. Dotted-quad formats: ::ffff:a.b.c.d, ::a.b.c.d, and expanded equivalents like 0:0:0:0:0:0:a.b.c.d
  const dottedMatch = normalized.match(/^(?:0{1,4}:){5}(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/i) ||
                      normalized.match(/^(?:::(?:ffff:)?)(\d+\.\d+\.\d+\.\d+)$/i);
  if (dottedMatch && dottedMatch[1]) {
    return dottedMatch[1];
  }

  // 2. Hex formats: ::ffff:high:low, ::high:low, and expanded equivalents like 0:0:0:0:0:0:high:low
  const hexMatch = normalized.match(/^(?:0{1,4}:){5}(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i) ||
                    normalized.match(/^(?:::(?:ffff:)?)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMatch && hexMatch[1] && hexMatch[2]) {
    const high = Number.parseInt(hexMatch[1], 16);
    const low = Number.parseInt(hexMatch[2], 16);
    return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
  }

  return address;
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function defaultPort(url: URL) {
  return url.protocol === "https:" ? "443" : "80";
}

function hostHeader(url: URL) {
  return url.port ? `${url.hostname}:${url.port}` : url.hostname;
}

export function setCrawlerFetchTransportForTests(transport: FetchTextTransport | null) {
  fetchTextTransport = transport ?? fetchPinnedText;
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
