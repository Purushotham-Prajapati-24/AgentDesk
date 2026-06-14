import { Readability } from "@mozilla/readability";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const MAX_MARKDOWN_CHARS = 500000;
const MAX_REDIRECTS = 3;

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
    const nextDataText = this.tryExtractNextData(html);
    if (nextDataText) {
      return nextDataText.slice(0, MAX_MARKDOWN_CHARS);
    }

    return this.cleanAndConvertHtml(html, url).slice(0, MAX_MARKDOWN_CHARS);
  }

  private async fetchPageHtml(url: string) {
    return fetchTextWithEgressGuard(url, {
      headers: {
        Accept: "text/html,text/plain,application/xhtml+xml",
        "User-Agent": "AgentDeskBot/2.0 (like Mozilla; crawling helper)",
      },
      timeoutMs: 10000,
    });
  }

  private tryExtractNextData(html: string) {
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

  private cleanAndConvertHtml(html: string, url: string) {
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
  const dom = new JSDOM(xml, { contentType: "text/xml", url });
  const links = Array.from(dom.window.document.querySelectorAll("loc"))
    .map((node) => normalizeHttpUrl(node.textContent ?? ""))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(links)).slice(0, limit);
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
  options: {
    headers: Record<string, string>;
    timeoutMs: number;
  },
  redirects = 0,
): Promise<string> {
  await assertAllowedHttpUrl(url);
  const response = await fetch(url, {
    headers: options.headers,
    redirect: "manual",
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  if (isRedirect(response.status)) {
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("URL redirects too many times.");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("URL redirected without a Location header.");
    }

    const redirectUrl = new URL(location, url).toString();
    return fetchTextWithEgressGuard(redirectUrl, options, redirects + 1);
  }

  if (!response.ok) {
    throw new Error(`URL could not be fetched: ${response.status} ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FETCH_BYTES) {
    throw new Error("URL content is too large to ingest.");
  }

  return (await response.text()).slice(0, MAX_FETCH_BYTES);
}

async function assertAllowedHttpUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs can be ingested.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs cannot be ingested.");
  }

  const literalIp = net.isIP(hostname);
  if (literalIp && isPrivateIp(hostname)) {
    throw new Error("Private-network URLs cannot be ingested.");
  }

  if (!literalIp) {
    const records = await lookup(hostname, { all: true, verbatim: false });
    if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
      throw new Error("Private-network URLs cannot be ingested.");
    }
  }
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

function isPrivateIp(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map((part) => Number.parseInt(part, 10));
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 0)
    );
  }

  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
