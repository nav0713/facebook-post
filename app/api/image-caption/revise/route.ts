import { NextRequest, NextResponse } from "next/server";
import { reviseImageCaptionWithGemini } from "@/lib/gemini";
import type { ImageCaptionRevisionResponse } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ImageCaptionRevisionResponse>> {
  let userCaption: string;
  let extractedText: string;
  let suggestedCaption: string | null;
  let suggestedHashtags: string[];

  try {
    const body = await req.json();
    userCaption = typeof body?.userCaption === "string" ? body.userCaption : "";
    extractedText = typeof body?.extractedText === "string" ? body.extractedText : "";
    suggestedCaption =
      typeof body?.suggestedCaption === "string" ? body.suggestedCaption : null;
    suggestedHashtags = Array.isArray(body?.suggestedHashtags)
      ? body.suggestedHashtags.filter(
          (item: unknown): item is string => typeof item === "string",
        )
      : [];
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!userCaption.trim() && !extractedText.trim()) {
    return NextResponse.json(
      { success: false, error: "A caption or extracted text is required." },
      { status: 400 },
    );
  }

  try {
    const data = await reviseImageCaptionWithGemini({
      userCaption,
      extractedText,
      suggestedCaption,
      suggestedHashtags,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    console.error("[/api/image-caption/revise] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
