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

  return `You are an expert news extraction assistant.

Your task is to read the article content and metadata, then extract the most important details and rewrite the article title into natural Taglish.

Rules:
- Base your answer only on the provided article text and metadata.
- Do not invent missing facts.
- If a field cannot be determined, return null.
- Return valid JSON only.
- Keep the summary factual and concise.
- Keep key points short and informative.
- The Taglish title and summary must be natural, readable, and faithful to the article.
- Avoid exaggerated or misleading clickbait.
- For serious or sensitive topics, use a respectful tone.

Taglish Guidelines (for both title and summary):
- Mix English and Filipino (Tagalog) naturally as Filipinos speak
- Keep it under 16 words for the title, and 2-3 sentences for summary
- Make it sound like a real Filipino news headline and summary
- Use natural Filipino expressions and vocabulary mixed with English
- Do not use jejemon, forced slang, meme language, or artificial mixing
- Do not change the factual meaning
- If the topic is crime, disaster, death, law, or politics, keep it professional and respectful
- Examples of natural Taglish:
  * "May bagong law na ipapasa sa Congress ngayong buwan"
  * "Ang sikat na celebrity ay nag-announce ng retirement sa showbiz"
  * "Ang presyo ng gas ay tumaas ulit dahil sa international market"

Return this exact JSON structure:
{
  "originalTitle": "string | null",
  "taglishTitle": "string | null (IN TAGLISH)",
  "summary": "string | null (IN TAGLISH - 2-3 sentences)",
  "keyPoints": ["string (IN TAGLISH)"],
  "who": ["string"],
  "what": "string | null (IN TAGLISH)",
  "when": "string | null",
  "where": ["string"],
  "why": "string | null (IN TAGLISH)",
  "keywords": ["string"],
  "author": "string | null",
  "publishedDate": "string | null",
  "source": "string | null",
  "facebookCaption": "string | null (2-paragraph summary in Taglish for Facebook, WITHOUT the word Bakit. Just 2 clean, short paragraphs separated by line breaks. No intro, just the summary.)"
}

Metadata:
- Original title: ${metadata.originalTitle ?? "unknown"}
- Author: ${metadata.author ?? "unknown"}
- Published date: ${metadata.publishedDate ?? "unknown"}
- Source: ${metadata.source ?? "unknown"}
- URL: ${metadata.url}

Article text:
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
      maxOutputTokens: 8192,
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
    throw new Error("Gemini returned an empty response.");
  }

  // Check if JSON looks incomplete (ends prematurely)
  const trimmedText = rawText.trim();
  if (!trimmedText.endsWith("}")) {
    throw new Error(
      "Gemini returned incomplete JSON response. This usually means the article is too long for the model to process completely. Try a shorter article or wait and try again.",
    );
  }

  const parsed = safeJsonParse<unknown>(rawText);
  if (!parsed) {
    throw new Error(
      `Failed to parse Gemini JSON response. The response may be truncated or malformed. Please try again with a different article.`,
    );
  }

  return validateResult(parsed);
}
