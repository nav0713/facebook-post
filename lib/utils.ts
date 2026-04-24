/**
 * Strips common tracking query params (utm_*, fbclid, ref) so the same
 * article URL always maps to the same cache key regardless of referral source.
 */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ref"].forEach(
      (p) => u.searchParams.delete(p),
    );
    return u.toString();
  } catch {
    return raw;
  }
}

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
    .replace(/​/g, "") // zero-width space
    .replace(/ /g, " ") // non-breaking space -> regular space
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


// Replaces U+201C / U+201D (curly double quotes) with ASCII " without using
// literal Unicode in a regex literal, which trips up some bundler parsers.
function normalizeQuotes(s: string): string {
  const L = String.fromCharCode(0x201C);
  const R = String.fromCharCode(0x201D);
  return s.split(L).join('"').split(R).join('"');
}

/**
 * Escapes literal control characters (U+0000-U+001F) that appear inside
 * JSON string values. Bare control chars are the most common reason Gemini
 * output fails JSON.parse (e.g. a literal newline in a summary field).
 */
function escapeControlCharsInStrings(s: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of s) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/**
 * Safely parses a JSON string. Returns null on failure.
 * Handles: markdown code fences, Unicode smart quotes, leading/trailing prose,
 * and literal control characters embedded inside string values.
 */
export function safeJsonParse<T>(raw: string): T | null {
  // Strip BOM and markdown code fences
  let text = raw.replace(/^﻿/, "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }
  text = normalizeQuotes(text);

  // Pass 1: direct parse
  try {
    return JSON.parse(text) as T;
  } catch { /* fall through */ }

  // Pass 2: escape bare control characters inside string values
  try {
    return JSON.parse(escapeControlCharsInStrings(text)) as T;
  } catch { /* fall through */ }

  // Pass 3: extract outermost {...} block (handles leading prose from the model)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(
        escapeControlCharsInStrings(text.slice(start, end + 1))
      ) as T;
    } catch { /* fall through */ }
  }

  return null;
}
