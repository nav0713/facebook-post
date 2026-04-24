import Parser from "rss-parser";
import { getDb } from "./news-db";
import type { NewsSource, RefreshResult } from "@/types/news";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "NewsAggregator/1.0",
  },
});

export async function refreshAllFeeds(): Promise<RefreshResult & { details?: any[] }> {
  const db = getDb();
  const sources = db.prepare("SELECT * FROM sources WHERE active = 1").all() as NewsSource[];

  const results = await Promise.allSettled(
    sources.map((source) => refreshFeed(db, source))
  );

  let totalInserted = 0;
  let errorCount = 0;
  const details: any[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];
    if (result.status === "fulfilled") {
      totalInserted += result.value;
      details.push({ source: source.name, status: "success", inserted: result.value });
    } else {
      errorCount++;
      details.push({
        source: source.name,
        status: "error",
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }
  }

  return { inserted: totalInserted, errors: errorCount, details };
}

async function refreshFeed(db: Database.Database, source: NewsSource): Promise<number> {
  try {
    const feed = await parser.parseURL(source.url);
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO articles (source_id, title, url, description, image_url, published_at, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    for (const item of feed.items) {
      const imageUrl = extractImage(item);
      const category = inferCategory(item.title || "", source.category);

      const result = stmt.run(
        source.id,
        item.title || "",
        item.link || "",
        item.contentSnippet || item.description || null,
        imageUrl,
        item.pubDate || null,
        category
      );

      if (result.changes > 0) {
        inserted++;
      }
    }

    console.log(`✓ ${source.name}: ${inserted} articles`);
    return inserted;
  } catch (err) {
    console.error(`✗ ${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

function extractImage(item: any): string | null {
  // Try enclosure (common in RSS)
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  // Try content:encoded with img tag
  if (item["content:encoded"]) {
    const imgMatch = (item["content:encoded"] as string).match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }

  // Try media:content
  if (item.media?.content?.[0]?.$.url) {
    return item.media.content[0].$.url;
  }

  // Try description with img tag
  if (item.description) {
    const imgMatch = (item.description as string).match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}

function inferCategory(title: string, defaultCategory: string): string {
  const lower = title.toLowerCase();

  if (/politics|election|government|congress|senate|congress|mayor|governor|barangay/.test(lower)) {
    return "politics";
  }
  if (/crime|murder|robbery|theft|arrest|court|lawsuit/.test(lower)) {
    return "crime";
  }
  if (/sport|football|basketball|boxing|tennis|game|league/.test(lower)) {
    return "sports";
  }
  if (/tech|technology|ai|software|app|gadget|innovation/.test(lower)) {
    return "tech";
  }
  if (/business|market|stocks|trade|commerce|economy|company|profit/.test(lower)) {
    return "business";
  }

  return defaultCategory;
}

// Type import for Database (avoid runtime import)
import type Database from "better-sqlite3";
