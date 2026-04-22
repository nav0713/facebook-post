/**
 * Validates whether a given string is a well-formed HTTP/HTTPS URL.
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Truncates text to a maximum character count, preserving whole words.
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
}

/**
 * Cleans raw article text extracted from HTML:
 * - Collapses multiple blank lines
 * - Strips excessive whitespace
 * - Removes zero-width characters
 */
export function cleanArticleText(raw: string): string {
  return raw
    .replace(/\u200B/g, "") // zero-width space
    .replace(/\u00A0/g, " ") // non-breaking space → regular space
    .replace(/[ \t]+/g, " ") // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ newlines into 2
    .trim();
}

/**
 * Extracts the hostname (without www.) from a URL string.
 * Returns null if the URL is invalid.
 */
export function extractHostname(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Safely parses a JSON string. Returns null on failure.
 */
export function safeJsonParse<T>(raw: string): T | null {
  try {
    // Strip markdown code fences if Gemini wrapped the JSON
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
