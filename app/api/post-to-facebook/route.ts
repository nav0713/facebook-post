import { NextRequest, NextResponse } from "next/server";

const GRAPH_API = "https://graph.facebook.com/v22.0";

export async function POST(req: NextRequest) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json(
      { error: "Facebook credentials not configured. Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to .env.local." },
      { status: 500 }
    );
  }

  let imageDataUrl: string;
  let caption: string;
  let scheduledPublishTime: number | undefined;
  try {
    const body = await req.json();
    imageDataUrl = body.imageDataUrl;
    caption = body.caption ?? "";
    scheduledPublishTime = body.scheduledPublishTime ?? undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!imageDataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }

  if (scheduledPublishTime !== undefined) {
    const tenMinutesFromNow = Math.floor(Date.now() / 1000) + 10 * 60;
    const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    if (scheduledPublishTime < tenMinutesFromNow || scheduledPublishTime > thirtyDaysFromNow) {
      return NextResponse.json(
        { error: "Scheduled time must be between 10 minutes and 30 days from now." },
        { status: 400 }
      );
    }
  }

  // Decode base64 data URL → Buffer
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  // Build multipart form data
  const formData = new FormData();
  formData.append("source", new Blob([buffer], { type: "image/png" }), "post-graphic.png");
  formData.append("message", caption);
  formData.append("access_token", accessToken);
  if (scheduledPublishTime !== undefined) {
    formData.append("published", "false");
    formData.append("scheduled_publish_time", String(scheduledPublishTime));
  }

  try {
    const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json() as Record<string, unknown>;

    if (!res.ok || result.error) {
      const msg =
        (result.error as Record<string, unknown> | undefined)?.message as string
        ?? "Facebook API error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true, postId: result.id });
  } catch {
    return NextResponse.json({ error: "Failed to reach Facebook API" }, { status: 502 });
  }
}
