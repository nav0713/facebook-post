import { NextRequest, NextResponse } from "next/server";
import { parseArticle } from "@/lib/article";
import { extractWithGemini } from "@/lib/gemini";
import { isValidUrl, normalizeUrl } from "@/lib/utils";
import { getCachedExtraction, setCachedExtraction } from "@/lib/news-db";
import type { ExtractResponse } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse<ExtractResponse>> {
  let url: string;

  try {
    const body = await req.json();
    url = body?.url;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body. Expected JSON with a `url` field." },
      { status: 400 }
    );
  }

  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json(
      { success: false, error: "A URL is required." },
      { status: 400 }
    );
  }

  url = url.trim();

  if (!isValidUrl(url)) {
    return NextResponse.json(
      { success: false, error: "Please provide a valid HTTP or HTTPS URL." },
      { status: 400 }
    );
  }

  try {
    const cacheKey = normalizeUrl(url);
    const { text, metadata } = await parseArticle(url);

    const cached = getCachedExtraction(cacheKey);
    if (cached) {
      // Backfill metadata fields (always use fresh scrape for accuracy)
      cached.originalTitle = metadata.originalTitle ?? cached.originalTitle;
      cached.author        = metadata.author        ?? cached.author;
      cached.publishedDate = metadata.publishedDate ?? cached.publishedDate;
      cached.source        = metadata.source        ?? cached.source;
      console.log("[/api/extract] Cache hit for:", cacheKey);
      return NextResponse.json({ success: true, data: cached, metadata });
    }

    const extraction = await extractWithGemini(text, metadata);

    // Backfill metadata fields the model no longer generates
    extraction.originalTitle = metadata.originalTitle ?? extraction.originalTitle;
    extraction.author        = metadata.author        ?? extraction.author;
    extraction.publishedDate = metadata.publishedDate ?? extraction.publishedDate;
    extraction.source        = metadata.source        ?? extraction.source;

    setCachedExtraction(cacheKey, extraction);

    return NextResponse.json({ success: true, data: extraction, metadata });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    console.error("[/api/extract] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
