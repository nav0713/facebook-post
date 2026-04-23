import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { ArticleMetadata } from "@/types/extraction";
import type { ExtractionResult } from "@/types/extraction";
import { truncateText, safeJsonParse } from "@/lib/utils";

const MAX_ARTICLE_CHARS = 6_000;

function buildPrompt(articleText: string, metadata: ArticleMetadata): string {
  const truncated = truncateText(articleText, MAX_ARTICLE_CHARS);

  return `You are an expert news extraction assistant. Extract key information from the article and provide a Taglish summary.

Rules:
- Base answers ONLY on provided text. Do not invent facts.
- Return null for missing fields.
- Be concise: keep all text responses SHORT.
- Use natural Taglish (mix English/Tagalog as Filipinos speak naturally).
- "hashtags": 5–8 relevant hashtags in English or Filipino, each starting with #.

Return EXACTLY this JSON (keep all text responses VERY SHORT):
{
  "originalTitle": "string or null",
  "taglishTitle": "short title in Taglish (max 15 words)",
  "summary": "1-2 sentences in Taglish, concise",
  "keyPoints": ["short point 1", "short point 2"],
  "who": ["name or entity"],
  "what": "what happened (1 short sentence in Taglish)",
  "when": "date or null",
  "where": ["location"],
  "why": "reason (1 short sentence in Taglish)",
  "keywords": ["word1", "word2"],
  "hashtags": ["#Tag1", "#Tag2"],
  "author": "string or null",
  "publishedDate": "string or null",
  "source": "string or null",
  "facebookCaption": "2 short paragraphs in Taglish for Facebook share"
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
    originalTitle: getString("originalTitle"),
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
    author: getString("author"),
    publishedDate: getString("publishedDate"),
    source: getString("source"),
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
      maxOutputTokens: 32000,
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
