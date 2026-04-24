import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/news-db";
import type { NewsSource } from "@/types/news";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid source ID" }, { status: 400 });
    }

    const body = await req.json();
    const { name, category, active } = body;

    const db = getDb();

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }

    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }

    if (active !== undefined) {
      updates.push("active = ?");
      values.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE sources SET ${updates.join(", ")} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(id) as NewsSource;
    return NextResponse.json(source);
  } catch (err) {
    console.error("PATCH /api/news/sources/[id] error:", err);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid source ID" }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare("DELETE FROM sources WHERE id = ?");
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/news/sources/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
