import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { WebsiteCrawler, discoverSitemapUrls, normalizeHttpUrl } from "../src/lib/server/crawler.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("WebsiteCrawler extracts Next.js page props before DOM conversion", async () => {
  globalThis.fetch = async () =>
    new Response(
      '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"title":"Docs","items":["Install","Ship"]}}}</script></body></html>',
      { status: 200, headers: { "content-type": "text/html" } },
    );

  const markdown = await new WebsiteCrawler().crawl("https://example.com/docs");

  assert.match(markdown, /"title": "Docs"/);
  assert.match(markdown, /"Install"/);
});

test("WebsiteCrawler converts readable HTML into structural markdown with links", async () => {
  globalThis.fetch = async () =>
    new Response(
      '<html><body><article><h1>Help Center</h1><p>Read the <a href="/docs">docs</a>.</p><ul><li>Fast setup</li></ul></article></body></html>',
      { status: 200, headers: { "content-type": "text/html" } },
    );

  const markdown = await new WebsiteCrawler().crawl("https://example.com/help");

  assert.match(markdown, /# Help Center/);
  assert.match(markdown, /\[docs\]\(https:\/\/example.com\/docs\)/);
  assert.match(markdown, /- Fast setup/);
});

test("discoverSitemapUrls returns unique normalized HTTP URLs", async () => {
  globalThis.fetch = async () =>
    new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://example.com/a#section</loc></url>
        <url><loc>https://example.com/a</loc></url>
        <url><loc>ftp://example.com/file</loc></url>
        <url><loc>https://example.com/b</loc></url>
      </urlset>`,
      { status: 200, headers: { "content-type": "application/xml" } },
    );

  const urls = await discoverSitemapUrls("https://example.com/sitemap.xml", 30);

  assert.deepEqual(urls, ["https://example.com/a", "https://example.com/b"]);
});

test("normalizeHttpUrl only accepts http and https URLs", () => {
  assert.equal(normalizeHttpUrl("https://example.com/path#hash"), "https://example.com/path");
  assert.equal(normalizeHttpUrl("ftp://example.com/path"), null);
  assert.equal(normalizeHttpUrl("not a url"), null);
});
