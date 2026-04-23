import { NextRequest, NextResponse } from "next/server";
import { generateAlternateTitleWithGemini } from "@/lib/gemini";
import type {
  ArticleMetadata,
  ExtractionResult,
  RefreshTitleResponse,
} from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
): Promise<NextResponse<RefreshTitleResponse>> {
  let data: ExtractionResult;
  let metadata: ArticleMetadata;
  let currentTitle: string | null;

  try {
    const body = await req.json();
    data = body?.data;
    metadata = body?.metadata;
    currentTitle =
      typeof body?.currentTitle === "string" ? body.currentTitle : null;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isExtractionResult(data) || !isArticleMetadata(metadata)) {
    return NextResponse.json(
      { success: false, error: "Missing article extraction data." },
      { status: 400 },
    );
  }

  try {
    const taglishTitle = await generateAlternateTitleWithGemini({
      extraction: data,
      metadata,
      currentTitle,
    });

    return NextResponse.json({ success: true, taglishTitle });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not refresh the title.";

    console.error("[/api/title/refresh] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

function isExtractionResult(value: unknown): value is ExtractionResult {
  if (!value || typeof value !== "object") return false;
  const obj = value as Partial<ExtractionResult>;
  return (
    Array.isArray(obj.keyPoints) &&
    Array.isArray(obj.who) &&
    Array.isArray(obj.where) &&
    Array.isArray(obj.keywords) &&
    Array.isArray(obj.hashtags)
  );
}

function isArticleMetadata(value: unknown): value is ArticleMetadata {
  if (!value || typeof value !== "object") return false;
  const obj = value as Partial<ArticleMetadata>;
  return typeof obj.url === "string";
}
