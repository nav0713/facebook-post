import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { ArticleMetadata } from "@/types/extraction";
import type { ExtractionResult } from "@/types/extraction";
import type { ImageExtractionResult } from "@/types/extraction";
import type { ImageTextElementRole } from "@/types/extraction";
import type { ImageCaptionRevisionResult } from "@/types/extraction";
import { truncateText, safeJsonParse } from "@/lib/utils";

const MAX_ARTICLE_CHARS = 8_000;

interface AlternateTitleInput {
  extraction: ExtractionResult;
  metadata: ArticleMetadata;
  currentTitle: string | null;
}

function buildPrompt(articleText: string, metadata: ArticleMetadata): string {
  const truncated = truncateText(articleText, MAX_ARTICLE_CHARS);

  return `You are an expert news extraction assistant. Extract key information from the article and provide a Taglish summary.

Rules:
- Base answers ONLY on provided text. Do not invent facts.
- Return null for missing fields.
- Be concise for structured fields, but keep the summary and Facebook caption informative.
- Use natural Taglish (mix English/Tagalog as Filipinos speak naturally).
- "taglishTitle": make it a concise, high-impact news graphic headline. Remove filler words and keep only the core message.
- "summary": preserve the most important facts. Include key who/what/when/where/why details when available.
- "facebookCaption": preserve the important context and key details from the article. Make it readable, informative, and complete without inventing facts.
- "hashtags": 5–8 relevant hashtags in English or Filipino, each starting with #.

Return EXACTLY this JSON:
{
  "taglishTitle": "concise high-impact title in Taglish (max 10 words)",
  "summary": "informative Taglish summary, around 3-5 sentences, with important details intact",
  "keyPoints": ["short point 1", "short point 2"],
  "who": ["name or entity"],
  "what": "what happened (1 short sentence in Taglish)",
  "when": "date or null",
  "where": ["location"],
  "why": "reason (1 short sentence in Taglish)",
  "keywords": ["word1", "word2"],
  "hashtags": ["#Tag1", "#Tag2"],
  "facebookCaption": "3-4 paragraphs max in Taglish for Facebook share, informative and detailed"
}

Metadata:
- Original title: ${metadata.originalTitle ?? "unknown"}
- Author: ${metadata.author ?? "unknown"}
- Published: ${metadata.publishedDate ?? "unknown"}
- Source: ${metadata.source ?? "unknown"}

Article:
${truncated}`;
}

function validateResult(raw: unknown): ExtractionResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini returned an invalid response structure.");
  }

  const obj = raw as Record<string, unknown>;

  const getString = (key: string): string | null => {
    const v = obj[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const getStringArray = (key: string): string[] => {
    const v = obj[key];
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
      .map((item) => item.trim());
  };

  return {
    originalTitle: null,
    taglishTitle: getString("taglishTitle"),
    summary: getString("summary"),
    keyPoints: getStringArray("keyPoints"),
    who: getStringArray("who"),
    what: getString("what"),
    when: getString("when"),
    where: getStringArray("where"),
    why: getString("why"),
    keywords: getStringArray("keywords"),
    hashtags: getStringArray("hashtags"),
    author: null,
    publishedDate: null,
    source: null,
    facebookCaption: getString("facebookCaption"),
  };
}

export async function extractWithGemini(
  articleText: string,
  metadata: ArticleMetadata,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  const prompt = buildPrompt(articleText, metadata);
  const result = await model.generateContent(prompt);
  const response = result.response;

  if (!response) {
    throw new Error("No response received from Gemini.");
  }

  const rawText = response.text();
  if (!rawText) {
    throw new Error("Gemini returned an empty response. The article may be too short or blocked by safety filters.");
  }

  const trimmedText = rawText.trim();
  console.log("[Gemini] Response length:", rawText.length);
  console.log("[Gemini] Last 300 chars:", trimmedText.slice(-300));

  // Check if JSON looks incomplete (ends prematurely)
  if (!trimmedText.endsWith("}")) {
    console.warn("[Gemini] Incomplete response (doesn't end with }):", trimmedText.slice(-500));
    throw new Error(
      "Gemini returned incomplete JSON response. This usually means the response hit the token limit. The article may be too long.",
    );
  }

  // Try parsing with detailed error info
  try {
    const parsed = JSON.parse(trimmedText);
    return validateResult(parsed);
  } catch (directErr) {
    console.warn("[Gemini] Direct JSON.parse failed:", directErr instanceof Error ? directErr.message : directErr);
  }

  // Fallback to safeJsonParse
  const parsed = safeJsonParse<unknown>(rawText);
  if (!parsed) {
    console.error("[Gemini] Full response that failed to parse:", rawText);
    throw new Error(
      `Failed to parse Gemini JSON response. Check server logs for full response.`,
    );
  }

  return validateResult(parsed);
}

function validateImageExtractionResult(raw: unknown): ImageExtractionResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini returned an invalid image extraction response.");
  }

  const obj = raw as Record<string, unknown>;
  const getString = (key: string): string | null => {
    const value = obj[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const cropBox = validateCropBox(obj.cropBox);
  const brandingBoxes = validateCropBoxes(obj.brandingBoxes);
  const textBoxes = validateCropBoxes(obj.textBoxes);
  const textElements = validateTextElements(obj.textElements);

  return {
    cropBox,
    brandingBoxes,
    textBoxes,
    textElements,
    extractedText: getString("extractedText"),
    facebookCaption: cleanImageCaption(getString("facebookCaption")),
    hashtags: getStringArrayFromRecord(obj, "hashtags"),
    description: getString("description"),
    recreationPrompt: getString("recreationPrompt"),
  };
}

function cleanImageCaption(caption: string | null): string | null {
  if (!caption) return null;

  const cleaned = caption
    .replace(
      /^(makikita sa (mga )?larawan|sa (mga )?larawan|ayon sa (text|nakasulat|caption)( na)?( nasa| nakalagay sa)? (larawan|image)|nakasulat sa (mga )?larawan|base sa (image|larawan))[:,\s-]*/i,
      "",
    )
    .trim();

  return cleaned || caption;
}

function getStringArrayFromRecord(
  obj: Record<string, unknown>,
  key: string,
): string[] {
  const value = obj[key];
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    )
    .map((item) => item.trim());
}

function validateCropBoxes(value: unknown): ImageExtractionResult["brandingBoxes"] {
  if (!Array.isArray(value)) return [];

  return value
    .map(validateCropBox)
    .filter((box): box is NonNullable<ImageExtractionResult["cropBox"]> =>
      Boolean(box),
    );
}

function validateCropBox(value: unknown): ImageExtractionResult["cropBox"] {
  if (!value || typeof value !== "object") return null;

  const box = value as Record<string, unknown>;
  const xMin = Number(box.xMin);
  const yMin = Number(box.yMin);
  const xMax = Number(box.xMax);
  const yMax = Number(box.yMax);

  if (![xMin, yMin, xMax, yMax].every(Number.isFinite)) return null;

  const clamped = {
    xMin: Math.max(0, Math.min(1000, xMin)),
    yMin: Math.max(0, Math.min(1000, yMin)),
    xMax: Math.max(0, Math.min(1000, xMax)),
    yMax: Math.max(0, Math.min(1000, yMax)),
  };

  if (clamped.xMax <= clamped.xMin || clamped.yMax <= clamped.yMin) {
    return null;
  }

  return clamped;
}

function validateTextElements(value: unknown): ImageExtractionResult["textElements"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      const box = validateCropBox(obj.box);
      const role = normalizeTextElementRole(obj.role);

      if (!text || !box) return null;
      return { text, role, box };
    })
    .filter((item): item is ImageExtractionResult["textElements"][number] =>
      Boolean(item),
    );
}

function normalizeTextElementRole(value: unknown): ImageTextElementRole {
  const role = typeof value === "string" ? value : "";
  if (
    role === "date" ||
    role === "headline" ||
    role === "nameTag" ||
    role === "caption" ||
    role === "quote" ||
    role === "other"
  ) {
    return role;
  }

  return "other";
}

export async function extractImageWithGemini({
  base64,
  mimeType,
}: {
  base64: string;
  mimeType: string;
}): Promise<ImageExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  const prompt = `Analyze this image so another renderer can recreate it as a square 1080x1080 editorial social news image.

Target recreation instruction:
"Recreate the provided news-style image by strictly following the reference image's original composition, subject placement, scale, cropping, and visual hierarchy (do not impose or change layout), accurately preserving all people, poses, expressions, and background elements (including crowd or national symbols only if present), while removing all logos, watermarks, branding, usernames, and source labels; then apply a dramatic editorial news style (high contrast, deep cinematic shadows, slight desaturation with strong reds and natural skin tones preserved, subtle film grain, vignette, facial sharpening, optional depth blur, warm highlights and cool shadows), and conditionally recreate ONLY the text elements that exist in the original (such as date bar, headline, name tag, or captions) with clean modern bold sans-serif typography, proper hierarchy, and adaptive placement in available space without covering key subjects - do not add missing elements or force structure - output as a square 1080x1080 ultra-detailed, clean editorial social media image."

Rules:
- Return one "cropBox" bounding box that covers all visible people or primary subjects. Keep full visible body, hair, face, clothing, hands, accessories, and important symbols. If there are no people, use the primary news subject. If there is no clear subject, return null.
- Identify all visible logos, watermarks, publication marks, usernames, social handles, URLs, source labels, platform labels, QR prompts, and brand/source marks in "brandingBoxes".
- Identify every visible text block in "textBoxes", including text that should be recreated and text that should be removed.
- Return "textElements" ONLY for non-branding text that exists in the original and should be recreated in the final image: date bars, headlines, name tags, captions, and quotes. Do not include usernames, publication labels, watermarks, URLs, or source marks.
- For each text element, preserve the readable wording and line breaks as much as possible, classify the role as "date", "headline", "nameTag", "caption", "quote", or "other", and provide its original bounding box.
- Separately extract all meaningful readable non-branding text in "extractedText", preserving useful wording and line breaks.
- Exclude social handles, usernames, page names, URLs, QR prompts, platform labels, watermarks, logos, source marks, and branding from "extractedText".
- Write a factual Facebook post article caption based ONLY on meaningful readable text and visible context.
- The Facebook caption must be natural Taglish, informative, and must not invent names, dates, places, causes, claims, or details not visible in the image.
- If the image does not provide enough factual context for a caption, keep the caption generic and say only what is visible.
- Write directly as a news caption. Do not use meta phrases like "makikita sa larawan", "sa larawan", "ayon sa text", "nakasulat sa larawan", "base sa image", or similar wording.
- Create 5 to 8 relevant hashtags based ONLY on visible text/context.
- Use normalized coordinates from 0 to 1000.
- If there is no visible branding, return an empty array for "brandingBoxes".
- If there is no visible text overlay, return an empty array for "textBoxes" and "textElements".
- If there is no meaningful non-branding text, return null for "extractedText".
- Add a concise one-sentence visual description of the whole reference composition in "description".
- Add a concise renderer-facing "recreationPrompt" that summarizes composition, subject placement, removals, text recreation, and editorial styling without adding facts.

Return EXACTLY this JSON:
{
  "cropBox": { "xMin": 0, "yMin": 0, "xMax": 1000, "yMax": 1000 },
  "brandingBoxes": [{ "xMin": 0, "yMin": 0, "xMax": 1000, "yMax": 1000 }],
  "textBoxes": [{ "xMin": 0, "yMin": 0, "xMax": 1000, "yMax": 1000 }],
  "textElements": [{ "text": "existing non-branding text", "role": "headline", "box": { "xMin": 0, "yMin": 0, "xMax": 1000, "yMax": 1000 } }],
  "extractedText": "meaningful non-branding text from the image, preserving line breaks, or null",
  "facebookCaption": "factual Taglish Facebook post caption based only on visible image text/context, or null",
  "hashtags": ["#Tag1", "#Tag2"],
  "description": "concise description of the full reference composition, or null",
  "recreationPrompt": "concise prompt for faithful editorial image recreation, or null"
}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64,
        mimeType,
      },
    },
  ]);

  const rawText = getGeminiResponseText(result.response);
  if (!rawText) {
    throw new Error("Gemini returned an empty image extraction response.");
  }

  const parsed = safeJsonParse<unknown>(rawText);
  if (!parsed) {
    console.error("[Gemini] Image extraction response failed to parse:", rawText);
    throw new Error("Failed to parse Gemini image extraction response.");
  }

  return validateImageExtractionResult(parsed);
}

function validateImageCaptionRevisionResult(
  raw: unknown,
): ImageCaptionRevisionResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini returned an invalid caption revision response.");
  }

  const obj = raw as Record<string, unknown>;
  const caption =
    typeof obj.facebookCaption === "string" ? obj.facebookCaption.trim() : "";

  if (!caption) {
    throw new Error("Gemini returned an empty revised caption.");
  }

  return {
    facebookCaption: cleanImageCaption(caption) ?? caption,
    hashtags: getStringArrayFromRecord(obj, "hashtags"),
  };
}

export async function reviseImageCaptionWithGemini({
  userCaption,
  extractedText,
  suggestedCaption,
  suggestedHashtags,
}: {
  userCaption: string;
  extractedText: string;
  suggestedCaption: string | null;
  suggestedHashtags: string[];
}): Promise<ImageCaptionRevisionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.25,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  const prompt = `Revise the user's Facebook post caption in natural Taglish.

Rules:
- Base the revised post ONLY on the user's caption and the extracted image text below.
- Do not invent facts, names, dates, locations, quotes, causes, numbers, or outcomes.
- Keep it readable for a Facebook news post: 2 to 4 short paragraphs.
- Preserve the user's intended meaning, but improve grammar, flow, clarity, and factual tone.
- Remove unsupported claims from the user's caption if they are not supported by the extracted image text.
- Write directly as a news caption. Do not say "makikita sa larawan", "sa larawan", "ayon sa text", "nakasulat sa larawan", "base sa image", or similar meta phrasing.
- Do not describe the post as an image or refer to the extracted text; just state the factual context.
- Create 5 to 8 relevant hashtags. Reuse relevant suggested hashtags when appropriate. Each hashtag must start with #.

Return EXACTLY this JSON:
{
  "facebookCaption": "2-4 short paragraphs in factual Taglish",
  "hashtags": ["#Tag1", "#Tag2"]
}

User caption:
${userCaption}

Extracted image text:
${extractedText}

Suggested image-only caption:
${suggestedCaption ?? "none"}

Suggested hashtags:
${suggestedHashtags.join(" ") || "none"}`;

  let rawText: string | null = null;
  try {
    const result = await model.generateContent(prompt);
    rawText = getGeminiResponseText(result.response);

    if (!rawText) {
      const response = result.response as unknown as {
        promptFeedback?: unknown;
        candidates?: Array<{ finishReason?: unknown; finishMessage?: unknown }>;
      };
      console.warn("[Gemini] Empty caption revision response:", {
        promptFeedback: response.promptFeedback,
        finishReason: response.candidates?.[0]?.finishReason,
        finishMessage: response.candidates?.[0]?.finishMessage,
      });
    }
  } catch (err) {
    console.warn(
      "[Gemini] Caption revision failed:",
      err instanceof Error ? err.message : err,
    );
  }

  if (!rawText) {
    return buildFallbackCaptionRevision({
      userCaption,
      extractedText,
      suggestedCaption,
      suggestedHashtags,
    });
  }

  const parsed = safeJsonParse<unknown>(rawText);
  if (!parsed) {
    console.error("[Gemini] Caption revision response failed to parse:", rawText);
    return buildFallbackCaptionRevision({
      userCaption,
      extractedText,
      suggestedCaption,
      suggestedHashtags,
    });
  }

  try {
    return validateImageCaptionRevisionResult(parsed);
  } catch (err) {
    console.warn(
      "[Gemini] Invalid caption revision shape:",
      err instanceof Error ? err.message : err,
    );
    return buildFallbackCaptionRevision({
      userCaption,
      extractedText,
      suggestedCaption,
      suggestedHashtags,
    });
  }
}

function buildFallbackCaptionRevision({
  userCaption,
  extractedText,
  suggestedCaption,
  suggestedHashtags,
}: {
  userCaption: string;
  extractedText: string;
  suggestedCaption: string | null;
  suggestedHashtags: string[];
}): ImageCaptionRevisionResult {
  const caption =
    cleanImageCaption(compactCaptionText(userCaption)) ??
    cleanImageCaption(compactCaptionText(suggestedCaption ?? "")) ??
    compactCaptionText(extractedText) ??
    "Pinakabagong update tungkol sa isyung ito.";

  return {
    facebookCaption: caption,
    hashtags: normalizeHashtags(suggestedHashtags, caption || extractedText),
  };
}

function compactCaptionText(text: string): string | null {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return cleaned || null;
}

function normalizeHashtags(seedHashtags: string[], fallbackText: string): string[] {
  const normalized = seedHashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .map((tag) => tag.replace(/[^\w#À-ž]/g, ""))
    .filter((tag) => tag.length > 1);

  const unique = Array.from(new Set(normalized));
  if (unique.length >= 5) return unique.slice(0, 8);

  const derived = fallbackText
    .replace(/#[\wÀ-ž-]+/g, " ")
    .replace(/[^A-Za-z0-9À-ž\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4)
    .slice(0, 8)
    .map((word) => `#${word.replace(/-/g, "")}`);

  return Array.from(new Set([...unique, ...derived])).slice(0, 8);
}

export async function generateAlternateTitleWithGemini({
  extraction,
  metadata,
  currentTitle,
}: AlternateTitleInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const context = {
    anchorTitle: metadata.originalTitle ?? extraction.originalTitle,
    currentTitle,
    what: sanitizeTitleContext(extraction.what),
    who: extraction.who,
    where: extraction.where,
    when: extraction.when,
    source: metadata.source ?? extraction.source,
  };

  const prompt = `Write ONE alternate Taglish news headline for a modern social news graphic.

Rules:
- Base the title ONLY on the provided facts. Do not invent details.
- Use natural Taglish.
- Make it relevant, urgent, curiosity-driven, and high-impact.
- Preserve the main person/entity and issue from the anchor title.
- Prefer a social-news hook, but do not exaggerate beyond the facts.
- Maximum 10 words.
- Use different wording from the current title.
- Avoid generic titles like "Bagong anggulo sa balita".
- Remove filler words.

Return EXACTLY this JSON:
{
  "taglishTitle": "string"
}

Facts:
${JSON.stringify(context, null, 2)}`;

  let rawText: string | null = null;
  try {
    const result = await model.generateContent(prompt);
    rawText = getGeminiResponseText(result.response);

    if (!rawText) {
      const response = result.response as unknown as {
        promptFeedback?: unknown;
        candidates?: Array<{ finishReason?: unknown; finishMessage?: unknown }>;
      };
      console.warn("[Gemini] Empty alternate title response:", {
        promptFeedback: response.promptFeedback,
        finishReason: response.candidates?.[0]?.finishReason,
        finishMessage: response.candidates?.[0]?.finishMessage,
      });
    }
  } catch (err) {
    console.warn(
      "[Gemini] Alternate title generation failed:",
      err instanceof Error ? err.message : err,
    );
  }

  if (!rawText) {
    return buildFallbackAlternateTitle(extraction, metadata, currentTitle);
  }

  const parsed = safeJsonParse<{ taglishTitle?: unknown }>(rawText);
  if (!parsed) {
    console.warn("[Gemini] Could not parse alternate title response:", rawText);
    return buildFallbackAlternateTitle(extraction, metadata, currentTitle);
  }

  const title = parsed.taglishTitle;
  if (typeof title !== "string" || !title.trim()) {
    return buildFallbackAlternateTitle(extraction, metadata, currentTitle);
  }

  const cleanedTitle = compactFallbackTitle(title);
  if (
    !cleanedTitle ||
    !isRelevantAlternateTitle(cleanedTitle, extraction, metadata, currentTitle)
  ) {
    return buildFallbackAlternateTitle(extraction, metadata, currentTitle);
  }

  return cleanedTitle;
}

function getGeminiResponseText(response: unknown): string | null {
  const maybeText = response as { text?: () => string };

  try {
    const text = maybeText.text?.().trim();
    if (text) return text;
  } catch {
    // Fall through to manual candidate parsing.
  }

  const structured = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = structured.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return text || null;
}

function sanitizeTitleContext(text: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/suic(?:ide|__e)/gi, "sensitive remark")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackAlternateTitle(
  extraction: ExtractionResult,
  metadata: ArticleMetadata,
  currentTitle: string | null,
): string {
  const current = normalizeForCompare(currentTitle);
  const anchor = compactFallbackTitle(
    metadata.originalTitle ?? extraction.originalTitle ?? currentTitle,
  );
  const primaryEntity = pickPrimaryEntity(extraction, anchor);
  const issue = pickIssuePhrase(extraction, metadata);
  const templates = buildFallbackTitleTemplates(primaryEntity, issue, anchor);

  for (const candidate of templates) {
    const title = compactFallbackTitle(candidate);
    if (
      title &&
      normalizeForCompare(title) !== current &&
      isRelevantAlternateTitle(title, extraction, metadata, currentTitle)
    ) {
      return title;
    }
  }

  return anchor && normalizeForCompare(anchor) !== current
    ? anchor
    : "Mainit na isyu, umani ng reaksyon";
}

function compactFallbackTitle(text: string | null): string | null {
  if (!text?.trim()) return null;

  const words = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^A-Za-z0-9À-ž\s'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return null;
  return words.slice(0, 10).join(" ");
}

function normalizeForCompare(text: string | null): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9à-ž]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRelevantAlternateTitle(
  title: string,
  extraction: ExtractionResult,
  metadata: ArticleMetadata,
  currentTitle: string | null,
): boolean {
  const normalizedTitle = normalizeForCompare(title);
  if (!normalizedTitle || normalizedTitle === normalizeForCompare(currentTitle)) {
    return false;
  }

  const anchors = [
    metadata.originalTitle,
    extraction.originalTitle,
    extraction.what,
    extraction.summary,
    ...extraction.who,
    ...extraction.keyPoints,
  ]
    .map(normalizeForCompare)
    .join(" ");

  const titleTokens = importantTokens(normalizedTitle);
  if (titleTokens.length === 0) return false;

  return titleTokens.some((token) => anchors.includes(token));
}

function importantTokens(text: string): string[] {
  const stopWords = new Set([
    "ang",
    "and",
    "are",
    "bagong",
    "dahil",
    "ito",
    "kay",
    "kung",
    "may",
    "mga",
    "nag",
    "na",
    "ng",
    "sa",
    "si",
    "the",
    "umani",
  ]);

  return text
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

function pickPrimaryEntity(
  extraction: ExtractionResult,
  anchor: string | null,
): string {
  const who = extraction.who.find((item) => item.trim());
  if (who) return compactFallbackTitle(who) ?? who;

  const anchorWords = anchor?.split(/\s+/).filter(Boolean) ?? [];
  if (anchorWords.length > 0) {
    return anchorWords.slice(0, Math.min(3, anchorWords.length)).join(" ");
  }

  return "Isyu";
}

function pickIssuePhrase(
  extraction: ExtractionResult,
  metadata: ArticleMetadata,
): string {
  const fields = [
    extraction.what,
    extraction.summary,
    extraction.keyPoints[0],
    metadata.originalTitle,
    extraction.originalTitle,
  ];

  for (const field of fields) {
    const cleaned = compactFallbackTitle(field);
    if (cleaned) return cleaned;
  }

  return "viral na isyu";
}

function buildFallbackTitleTemplates(
  entity: string,
  issue: string,
  anchor: string | null,
): string[] {
  const issueWords = issue.split(/\s+/).filter(Boolean);
  const shortIssue = issueWords.slice(0, 6).join(" ");

  return [
    `${entity}, inulan ng batikos`,
    `${entity}, umani ng matinding reaksyon`,
    `Biro ni ${entity}, pinag-uusapan ngayon`,
    `${entity}, bakit kinuyog online?`,
    `Netizens umalma sa isyu ni ${entity}`,
    `${shortIssue}, nag-trending online`,
    anchor ?? issue,
  ];
}
