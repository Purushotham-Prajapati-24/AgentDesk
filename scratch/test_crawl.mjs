import { WebsiteCrawler } from "../src/lib/server/crawler.ts";

async function main() {
  const crawler = new WebsiteCrawler();
  try {
    console.log("Crawling...");
    const markdown = await crawler.crawl("https://purushotham-prajapati-24.github.io/");
    console.log("Success! Length:", markdown.length);
    console.log("Preview:\n", markdown.slice(0, 500));
  } catch (err) {
    console.error("Crawl failed with:", err);
  }
}

main();
