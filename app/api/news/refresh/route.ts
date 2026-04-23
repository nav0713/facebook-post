import { NextResponse } from "next/server";
import { refreshAllFeeds } from "@/lib/news-rss";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await refreshAllFeeds();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("POST /api/news/refresh error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to refresh feeds", inserted: 0, errors: 1 },
      { status: 500 }
    );
  }
}
