import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { ArticleMetadata } from "@/types/extraction";
import type { ExtractionResult } from "@/types/extraction";
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
