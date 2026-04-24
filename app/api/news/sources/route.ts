import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/news-db";
import type { NewsSource } from "@/types/news";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const sources = db
      .prepare("SELECT * FROM sources ORDER BY name")
      .all() as NewsSource[];

    return NextResponse.json({ sources });
  } catch (err) {
    console.error("GET /api/news/sources error:", err);
    return NextResponse.json({ sources: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, category, type } = body;

    if (!name || !url || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, url, type" },
        { status: 400 }
      );
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO sources (name, url, category, type, active)
      VALUES (?, ?, ?, ?, 1)
    `);

    try {
      const result = stmt.run(name, url, category || "general", type);
      const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(result.lastInsertRowid) as NewsSource;
      return NextResponse.json(source, { status: 201 });
    } catch (err: any) {
      if (err.message?.includes("UNIQUE")) {
        return NextResponse.json({ error: "URL already exists" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error("POST /api/news/sources error:", err);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
