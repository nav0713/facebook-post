import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/news-db";
import type { NewsArticlesResponse } from "@/types/news";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse<NewsArticlesResponse>> {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const type = searchParams.get("type") || undefined;
    const sourceIdsStr = searchParams.get("source_ids") || undefined;
    const sourceIds = sourceIdsStr ? sourceIdsStr.split(",").map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)) : [];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const db = getDb();

    // Build WHERE clause dynamically
    const whereConditions: string[] = [];
    const params: (string | number)[] = [];

    if (category) {
      whereConditions.push("a.category = ?");
      params.push(category);
    }

    if (type) {
      whereConditions.push("s.type = ?");
      params.push(type);
    }

    if (sourceIds.length > 0) {
      const placeholders = sourceIds.map(() => "?").join(",");
      whereConditions.push(`a.source_id IN (${placeholders})`);
      params.push(...sourceIds);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total FROM articles a
      JOIN sources s ON a.source_id = s.id
      ${whereClause}
    `;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    // Fetch paginated articles
    const offset = (page - 1) * limit;
    const articlesQuery = `
      SELECT
        a.id, a.source_id, s.name as source_name, a.title, a.url,
        a.description, a.image_url, a.published_at, a.category, a.created_at
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      ${whereClause}
      ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = db.prepare(articlesQuery).all(...params, limit, offset) as any[];

    const hasMore = offset + articles.length < total;

    return NextResponse.json({
      articles,
      total,
      page,
      hasMore,
    });
  } catch (err) {
    console.error("GET /api/news/articles error:", err);
    return NextResponse.json(
      { articles: [], total: 0, page: 1, hasMore: false },
      { status: 500 }
    );
  }
}
