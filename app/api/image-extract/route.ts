import { NextRequest, NextResponse } from "next/server";
import { extractImageWithGemini } from "@/lib/gemini";
import type { ImageExtractResponse } from "@/types/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ImageExtractResponse>> {
  let file: File | null = null;

  try {
    const formData = await req.formData();
    const uploaded = formData.get("image");
    file = uploaded instanceof File ? uploaded : null;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body. Expected an image upload." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { success: false, error: "An image file is required." },
      { status: 400 },
    );
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported image type. Upload a JPG, PNG, WEBP, HEIC, or HEIF image.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { success: false, error: "Image is too large. Maximum size is 10MB." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await extractImageWithGemini({
      base64: buffer.toString("base64"),
      mimeType: file.type,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    console.error("[/api/image-extract] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
