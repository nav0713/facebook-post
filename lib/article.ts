import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import puppeteer, { Browser } from "puppeteer";
import type { ArticleMetadata } from "@/types/extraction";
import { cleanArticleText, extractHostname } from "@/lib/utils";

export interface ParsedArticle {
  text: string;
  metadata: ArticleMetadata;
}

let browserInstance: Browser | null = null;

interface FetchCandidate {
  url: string;
  userAgent: string;
  isMobile?: boolean;
}

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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

/**
 * Fetches the HTML content of a URL using Puppeteer (handles JavaScript and bot detection).
 */
async function fetchHtml(url: string): Promise<string> {
  const candidates = buildFetchCandidates(url);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const html = await fetchHtmlCandidate(candidate);
      if (!isAccessDeniedHtml(html)) {
        return html;
      }
      lastError = new Error("The site returned an access denied page.");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `Failed to fetch article: ${lastError?.message ?? "all fetch attempts failed"}`
  );
}

async function fetchHtmlCandidate(candidate: FetchCandidate): Promise<string> {
  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(candidate.userAgent);
    if (candidate.isMobile) {
      await page.setViewport({
        width: 390,
        height: 844,
        isMobile: true,
        hasTouch: true,
      });
    }
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,fil;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    // Block images/media/fonts — we only need HTML text and meta tags
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const response = await page.goto(candidate.url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    const html = await page.content();

    if (response?.status() === 403 || isAccessDeniedHtml(html)) {
      throw new Error(`Access denied while fetching ${candidate.url}`);
    }

    return html;
  } catch (err) {
    throw new Error(
      `Failed to fetch article: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}

function buildFetchCandidates(url: string): FetchCandidate[] {
  const candidates: FetchCandidate[] = [
    { url, userAgent: DESKTOP_USER_AGENT },
  ];

  try {
    const parsed = new URL(url);

    if (!parsed.searchParams.has("amp")) {
      const amp = new URL(parsed);
      amp.searchParams.set("amp", "");
      candidates.push({
        url: amp.toString(),
        userAgent: MOBILE_USER_AGENT,
        isMobile: true,
      });
    }

    if (!parsed.searchParams.has("output")) {
      const output = new URL(parsed);
      output.searchParams.set("output", "1");
      candidates.push({
        url: output.toString(),
        userAgent: MOBILE_USER_AGENT,
        isMobile: true,
      });
    }
  } catch {
    // The caller validates URLs before this point; keep original candidate only.
  }

  return candidates.filter(
    (candidate, index, list) =>
      list.findIndex((item) => item.url === candidate.url) === index
  );
}

function isAccessDeniedHtml(html: string): boolean {
  const lowered = html.slice(0, 5000).toLowerCase();
  return (
    lowered.includes("<title>403") ||
    lowered.includes("403 - forbidden") ||
    lowered.includes("access denied") ||
    lowered.includes("request forbidden")
  );
}

/**
 * Extracts metadata from the HTML document's <head> tags.
 */
function extractMetadata(document: Document, url: string): ArticleMetadata {
  const getMeta = (selectors: string[]): string | null => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const value =
        el?.getAttribute("content") ??
        el?.getAttribute("value") ??
        el?.textContent ??
        null;
      if (value?.trim()) return value.trim();
    }
    return null;
  };

  const originalTitle =
    getMeta([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ??
    document.querySelector("title")?.textContent?.trim() ??
    null;

  const author = getMeta([
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[name="twitter:creator"]',
    '[rel="author"]',
    ".author",
    ".byline",
  ]);

  const publishedDate =
    getMeta([
      'meta[property="article:published_time"]',
      'meta[name="pubdate"]',
      'meta[name="date"]',
      'meta[itemprop="datePublished"]',
      'time[datetime]',
    ]) ??
    document.querySelector("time[datetime]")?.getAttribute("datetime") ??
    null;

  const source =
    getMeta([
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ]) ?? extractHostname(url);

  const featuredImage = getMeta([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[itemprop="image"]',
  ]);

  return {
    originalTitle,
    author,
    publishedDate,
    source,
    featuredImage,
    url,
  };
}

/**
 * Parses article text using Mozilla Readability and returns cleaned body text.
 */
function parseReadableText(
  document: Document,
  url: string
): string | null {
  try {
    const reader = new Readability(document, {
      charThreshold: 100,
      keepClasses: false,
    });
    const article = reader.parse();
    if (!article?.textContent) return null;
    return cleanArticleText(article.textContent);
  } catch {
    return null;
  }
}

/**
 * Fallback: strips all HTML tags and returns plain text from the body.
 */
function fallbackBodyText(document: Document): string {
  const body = document.body;
  if (!body) return "";
  // Remove script/style/nav/footer/header nodes
  const toRemove = body.querySelectorAll(
    "script,style,nav,footer,header,aside,noscript,iframe"
  );
  toRemove.forEach((el) => el.remove());
  return cleanArticleText(body.textContent ?? "");
}

/**
 * Main entry: fetches and parses an article from a URL.
 * Returns both extracted text and metadata.
 */
export async function parseArticle(url: string): Promise<ParsedArticle> {
  const html = await fetchHtml(url);

  // Parse DOM — clone for Readability since it mutates the document
  const dom = new JSDOM(html, { url });
  const metadataDom = new JSDOM(html, { url });

  const metadata = extractMetadata(metadataDom.window.document, url);
  const readableText = parseReadableText(dom.window.document, url);

  let text: string;
  if (readableText && readableText.length > 200) {
    text = readableText;
  } else {
    // Fallback to naive body-text extraction
    const fallbackDom = new JSDOM(html, { url });
    text = fallbackBodyText(fallbackDom.window.document);
  }

  if (!text || text.length < 50) {
    throw new Error(
      "Could not extract readable content from the article. The page may require JavaScript or a login."
    );
  }

  return { text, metadata };
}
