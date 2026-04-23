import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import puppeteer, { Browser } from "puppeteer";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  return browserInstance;
}

export interface ArticleContent {
  title: string;
  content: string;
  excerpt: string;
  byline?: string;
  length: number;
}

export async function fetchArticleContent(url: string): Promise<ArticleContent> {
  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const html = await page.content();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to parse article content");
    }

    return {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      byline: article.byline,
      length: article.length,
    };
  } catch (err) {
    throw new Error(`Failed to fetch article: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (page) {
      await page.close();
    }
  }
}
