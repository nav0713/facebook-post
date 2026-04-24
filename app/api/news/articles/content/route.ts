import { NextRequest, NextResponse } from "next/server";
import { fetchArticleContent } from "@/lib/article-fetcher";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing 'url' parameter" },
        { status: 400 }
      );
    }

    const content = await fetchArticleContent(url);
    return NextResponse.json(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/news/articles/content error:", message);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
