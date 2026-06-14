import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  WebsiteCrawler,
  assertAllowedHttpUrl,
  discoverSitemapUrls,
  isPrivateIp,
  normalizeHttpUrl,
  setCrawlerFetchTransportForTests,
} from "../src/lib/server/crawler.ts";

const originalBrowserlessKey = process.env.BROWSERLESS_API_KEY;

afterEach(() => {
  setCrawlerFetchTransportForTests(null);
  if (originalBrowserlessKey === undefined) {
    delete process.env.BROWSERLESS_API_KEY;
  } else {
    process.env.BROWSERLESS_API_KEY = originalBrowserlessKey;
  }
});

test("WebsiteCrawler extracts Next.js page props before DOM conversion", async () => {
  delete process.env.BROWSERLESS_API_KEY;
  setCrawlerFetchTransportForTests(async () => textResponse(
    '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"title":"Docs","items":["Install","Ship"]}}}</script></body></html>',
    "text/html",
  ));

  const markdown = await new WebsiteCrawler().crawl("https://93.184.216.34/docs");

  assert.match(markdown, /"title": "Docs"/);
  assert.match(markdown, /"Install"/);
});

test("WebsiteCrawler converts readable HTML into structural markdown with links", async () => {
  delete process.env.BROWSERLESS_API_KEY;
  setCrawlerFetchTransportForTests(async () => textResponse(
    '<html><body><article><h1>Help Center</h1><p>Read the <a href="/docs">docs</a>.</p><ul><li>Fast setup</li></ul></article></body></html>',
    "text/html",
  ));

  const markdown = await new WebsiteCrawler().crawl("https://93.184.216.34/help");

  assert.match(markdown, /# Help Center/);
  assert.match(markdown, /\[docs\]\(https:\/\/93\.184\.216\.34\/docs\)/);
  assert.match(markdown, /- Fast setup/);
});

test("discoverSitemapUrls returns unique normalized HTTP URLs", async () => {
  delete process.env.BROWSERLESS_API_KEY;
  setCrawlerFetchTransportForTests(async () => textResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://93.184.216.34/a#section</loc></url>
        <url><loc>https://93.184.216.34/a</loc></url>
        <url><loc>ftp://93.184.216.34/file</loc></url>
        <url><loc>https://127.0.0.1/private</loc></url>
        <url><loc>https://93.184.216.34/b</loc></url>
      </urlset>`,
    "application/xml",
  ));

  const urls = await discoverSitemapUrls("https://93.184.216.34/sitemap.xml", 30);

  assert.deepEqual(urls, ["https://93.184.216.34/a", "https://93.184.216.34/b"]);
});

test("normalizeHttpUrl only accepts http and https URLs", () => {
  assert.equal(normalizeHttpUrl("https://example.com/path#hash"), "https://example.com/path");
  assert.equal(normalizeHttpUrl("ftp://example.com/path"), null);
  assert.equal(normalizeHttpUrl("not a url"), null);
});

test("private and special network targets are rejected", async () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true);
  assert.equal(isPrivateIp("::1"), true);
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateIp("::ffff:0a00:0001"), true);
  assert.equal(isPrivateIp("93.184.216.34"), false);

  await assert.rejects(() => assertAllowedHttpUrl("http://127.0.0.1/"), /Private-network/);
  await assert.rejects(() => assertAllowedHttpUrl("http://169.254.169.254/"), /Private-network/);
  await assert.rejects(() => assertAllowedHttpUrl("http://[::1]/"), /Private-network/);
  await assert.rejects(() => assertAllowedHttpUrl("http://[::ffff:127.0.0.1]/"), /Private-network/);
});

test("crawler rejects non-default ports", async () => {
  await assert.rejects(() => assertAllowedHttpUrl("https://93.184.216.34:9200/"), /default HTTP and HTTPS ports/);
});

function textResponse(text, contentType) {
  return {
    status: 200,
    statusText: "OK",
    headers: new Headers({
      "content-type": contentType,
      "content-length": String(Buffer.byteLength(text)),
    }),
    text,
  };
}
