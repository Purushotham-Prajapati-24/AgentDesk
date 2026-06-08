import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const MAX_MARKDOWN_CHARS = 500000;

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
    const browserlessKey = process.env.BROWSERLESS_API_KEY;

    if (browserlessKey) {
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

    const response = await fetch(url, {
      headers: {
        Accept: "text/html,text/plain,application/xhtml+xml",
        "User-Agent": "AgentDeskBot/2.0 (like Mozilla; crawling helper)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`URL could not be fetched: ${response.status} ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_FETCH_BYTES) {
      throw new Error("URL content is too large to ingest.");
    }

    return (await response.text()).slice(0, MAX_FETCH_BYTES);
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
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml,text/xml,text/plain",
      "User-Agent": "AgentDeskBot/2.0 (like Mozilla; sitemap helper)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Sitemap could not be fetched: ${response.status} ${response.statusText}`);
  }

  const xml = (await response.text()).slice(0, MAX_FETCH_BYTES);
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

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
