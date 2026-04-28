import { NextRequest, NextResponse } from "next/server";
import { buildCaptionPrompt, buildImagePrompt } from "@/lib/prompts";
import type {
  GeneratePostRequestFields,
  GeneratePostResponse,
  OutputSize,
  PostTone,
} from "@/types/news-post";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_ARTICLE_CHARS = 12_000;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const POST_TONES = new Set<PostTone>(["dramatic", "intense", "neutral"]);
const OUTPUT_SIZES = new Set<OutputSize>([
  "1080x1080",
  "1080x1350",
  "1920x1080",
]);

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GeneratePostResponse>> {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body. Use multipart form data." },
      { status: 400 },
    );
  }

  const image = formData.get("image");
  const file = image instanceof File ? image : null;
  const fields = readFields(formData);

  if (!file) {
    return NextResponse.json(
      { success: false, error: "Please upload a news-style image." },
      { status: 400 },
    );
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: "Upload a JPG, PNG, or WEBP image." },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { success: false, error: "Image is too large. Maximum size is 12MB." },
      { status: 400 },
    );
  }

  const imagePrompt = buildImagePrompt(fields);
  const shouldGenerateCaption = Boolean(fields.article.trim());
  const captionPrompt = shouldGenerateCaption ? buildCaptionPrompt(fields) : null;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) {
      const placeholder = buildPlaceholderResult(fields);
      return NextResponse.json({ success: true, data: placeholder });
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    const [generatedImage, captionResult] = await Promise.all([
      editImageWithGemini({
        apiKey,
        base64Image,
        mimeType: file.type,
        prompt: imagePrompt,
      }),
      captionPrompt
        ? generateCaptionWithGemini({ apiKey, prompt: captionPrompt, fields })
        : Promise.resolve({ caption: "", hashtags: [] }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        generatedImage,
        caption: captionResult.caption,
        hashtags: captionResult.hashtags,
        outputSize: fields.outputSize,
        isPlaceholder: false,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not generate the post.";

    console.error("[/api/generate] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

function readFields(formData: FormData): GeneratePostRequestFields {
  const tone = readEnum(formData, "tone", POST_TONES, "dramatic");
  const outputSize = readEnum(
    formData,
    "outputSize",
    OUTPUT_SIZES,
    "1080x1080",
  );

  return {
    article: readString(formData, "article").slice(0, MAX_ARTICLE_CHARS),
    date: readString(formData, "date"),
    headline: readString(formData, "headline"),
    personName: readString(formData, "personName"),
    tone,
    outputSize,
  };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: Set<T>,
  fallback: T,
): T {
  const value = formData.get(key);
  return typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : fallback;
}

async function editImageWithGemini({
  apiKey,
  base64Image,
  mimeType,
  prompt,
}: {
  apiKey: string;
  base64Image: string;
  mimeType: string;
  prompt: string;
}): Promise<string> {
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const res = await fetch(geminiGenerateContentUrl(model, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Gemini image generation failed.");
  }

  const parts = json.candidates?.flatMap((candidate) => candidate.content?.parts ?? []);
  const imagePart = parts?.find((part) => part.inlineData?.data || part.inline_data?.data);
  const imageData = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  const generatedMimeType =
    imagePart?.inlineData?.mimeType ?? imagePart?.inline_data?.mime_type ?? "image/png";

  if (imageData) return `data:${generatedMimeType};base64,${imageData}`;

  const text = parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join(" ");

  throw new Error(
    text
      ? `Gemini returned text but no image: ${text}`
      : "Gemini did not return a regenerated image.",
  );
}

async function generateCaptionWithGemini({
  apiKey,
  prompt,
  fields,
}: {
  apiKey: string;
  prompt: string;
  fields: GeneratePostRequestFields;
}): Promise<{ caption: string; hashtags: string[] }> {
  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
  const res = await fetch(geminiGenerateContentUrl(model, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You write factual Philippine social news captions in natural Tagalog/Taglish. Never invent facts.\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: fields.tone === "neutral" ? 0.35 : 0.65,
        responseMimeType: "application/json",
      },
    }),
  });

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Gemini caption generation failed.");
  }

  const content = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();
  if (!content) throw new Error("Gemini returned an empty caption response.");

  const parsed = JSON.parse(content) as { caption?: unknown; hashtags?: unknown };
  const caption = typeof parsed.caption === "string" ? parsed.caption.trim() : "";
  const hashtags = normalizeHashtags(parsed.hashtags, fields.article);

  if (!caption) throw new Error("Gemini returned a caption without text.");

  return { caption, hashtags };
}

function geminiGenerateContentUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function buildPlaceholderResult(fields: GeneratePostRequestFields) {
  const hasArticle = Boolean(fields.article.trim());
  const caption = hasArticle ? buildFallbackCaption(fields) : "";
  const hashtags = hasArticle
    ? normalizeHashtags([], `${fields.headline} ${fields.article}`)
    : [];
  const svg = buildPlaceholderSvg(fields, caption);

  return {
    generatedImage: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    caption,
    hashtags,
    outputSize: fields.outputSize,
    isPlaceholder: true,
  };
}

function buildFallbackCaption(fields: GeneratePostRequestFields): string {
  const headline = fields.headline || firstSentence(fields.article) || "NEWS UPDATE";
  const sourceLine = fields.personName
    ? `Ayon sa ${fields.personName}, patuloy na sinusubaybayan ang mga detalye sa ulat na ito.`
    : "Batay sa ibinigay na artikulo, mahalagang manatiling maingat sa pagbabahagi ng detalye.";
  const articleLead = firstSentence(fields.article);

  return `${headline.toUpperCase()}

${articleLead}

${sourceLine}

Habang hinihintay ang mas malinaw na update, dapat manatiling factual ang pagtalakay at iwasan ang hindi kumpirmadong detalye.

Ano ang masasabi ninyo sa isyung ito?`;
}

function buildPlaceholderSvg(
  fields: GeneratePostRequestFields,
  caption: string,
): string {
  const headline = escapeXml(fields.headline || firstSentence(fields.article) || "NEWS UPDATE");
  const date = escapeXml(fields.date);
  const person = escapeXml(fields.personName);
  const tone = escapeXml(fields.tone.toUpperCase());
  const captionPreview = escapeXml(caption.split(/\r?\n/).find(Boolean) ?? "");
  const dateBadge = date
    ? `<rect x="84" y="92" width="240" height="56" rx="28" fill="#dc2626"/>
  <text x="204" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff">${date}</text>`
    : "";
  const personTag = person
    ? `<text x="116" y="894" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${person} / ${tone}</text>`
    : "";
  const captionPanel = captionPreview
    ? `<rect x="84" y="780" width="912" height="150" rx="24" fill="#020617" opacity="0.78"/>
  <text x="116" y="838" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff">${captionPreview.slice(0, 78)}</text>
  ${personTag}`
    : personTag;
  const brandMark = `<g aria-label="PhViralHub brand">
    <text x="835" y="124" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900">
      <tspan fill="#0038a8">Ph</tspan><tspan fill="#ce1126">Viral</tspan><tspan fill="#ffffff">Hub</tspan>
    </text>
    <circle cx="812" cy="112" r="9" fill="#fcd116"/>
    <path d="M812 94 L816 106 L829 106 L818 114 L822 127 L812 119 L802 127 L806 114 L795 106 L808 106 Z" fill="#fcd116" opacity="0.95"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.45" stop-color="#111113"/>
      <stop offset="1" stop-color="#991b1b"/>
    </linearGradient>
    <radialGradient id="v" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="0.52" stop-color="#000000" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.86"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#v)"/>
  <rect x="0" y="0" width="1080" height="1080" fill="#000000" opacity="0.18"/>
  <path d="M0 700 L1080 520 L1080 1080 L0 1080 Z" fill="#7f1d1d" opacity="0.72"/>
  <path d="M0 760 L1080 610" stroke="#ef4444" stroke-width="22" opacity="0.9"/>
  <rect x="64" y="64" width="952" height="952" rx="24" fill="none" stroke="#ef4444" stroke-width="8" opacity="0.9"/>
  ${dateBadge}
  ${brandMark}
  <text x="84" y="250" font-family="Arial Black, Arial, sans-serif" font-size="78" font-weight="900" fill="#ffffff">
    ${headline.split(" ").slice(0, 4).join(" ")}
  </text>
  <text x="84" y="338" font-family="Arial Black, Arial, sans-serif" font-size="78" font-weight="900" fill="#ffffff">
    ${headline.split(" ").slice(4, 8).join(" ")}
  </text>
  ${captionPanel}
</svg>`;
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || "";
}

function normalizeHashtags(value: unknown, fallbackText: string): string[] {
  const provided = Array.isArray(value) ? value : [];
  const normalized = provided
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
    .map((item) => item.replace(/[^\w#À-ž]/g, ""))
    .filter((item) => item.length > 1);

  const defaults = [
    "#NewsUpdate",
    "#BreakingNewsPH",
    "#TaglishNews",
    "#Pilipinas",
    "#Balita",
    "#Ulat",
    "#SocialNews",
    "#LatestUpdate",
    "#CurrentEvents",
    "#PublicInterest",
  ];

  const derived = fallbackText
    .replace(/#[\wÀ-ž-]+/g, " ")
    .replace(/[^A-Za-z0-9À-ž\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 5)
    .slice(0, 8)
    .map((word) => `#${word.replace(/-/g, "")}`);

  return Array.from(new Set([...normalized, ...derived, ...defaults])).slice(0, 15);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
