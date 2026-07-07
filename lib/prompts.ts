import type { GeneratePostRequestFields } from "@/types/news-post";

const BASE_IMAGE_PROMPT =
  "Recreate the uploaded news-style social media image. CRITICAL: You MUST completely erase all source logos, translucent text watermarks, URL overlays, and page marks anywhere in the image (corners, edges, center, or covering faces). Replace erased areas with clean, matching background texture. Preserve the main people, facial expressions, composition, and editorial layout. Apply a dramatic, high-impact news poster aesthetic with a distinct Philippine Flag Theme. Use royal blue, red, and golden yellow accents prominently in the borders, text backgrounds, and editorial layout. Keep the design clean, professional, and urgent. Replace text dynamically with the provided headline. Add one clean brand text mark that says PhViralHub. Output square 1080x1080.";

const BASE_CAPTION_PROMPT =
  "Rewrite the provided article into a Facebook-ready Tagalog/Taglish news caption. Make it engaging, clear, and dramatic but factual. Do not invent details. Use careful wording such as 'umano,' 'ayon sa,' and 'batay sa' for allegations. Include a strong headline, 3-6 short paragraphs, one engagement question, and 10-15 relevant hashtags.";

export function buildImagePrompt(fields: GeneratePostRequestFields): string {
  return `${BASE_IMAGE_PROMPT}

Replacement text:
- Brand label: PhViralHub
- Date: ${fields.date || "No replacement date provided."}
- Main headline: ${fields.headline || "Preserve or recreate a visible non-brand headline from the uploaded image if present; otherwise omit the headline instead of inventing one."}
- Person name: ${fields.personName || "Omit if not provided."}
- Tone: ${fields.tone}
- Output size: ${fields.outputSize}

Strict requirements:
- CRITICAL WATERMARK RULE: Do not copy, recreate, or leave smudges of any original publication logo, username, social handle, watermark, page mark, URL, QR code, or brand badge. Fill those removed areas perfectly with surrounding background textures.
- PHILIPPINE FLAG THEME: The overall aesthetic must integrate royal blue, red, golden yellow, and white. Use these colors for graphic elements like accent bars behind text, borders, or layout shapes. You may incorporate subtle star and sun motifs if appropriate for a news template, but keep it professional.
- Add exactly one replacement brand mark with the exact text "PhViralHub". Do not add any other outlet/page/source labels, usernames, watermarks, or brand identities.
- Style the PhViralHub text to match the Philippine flag theme. Keep it compact, professional, and placed like a small page brand label without covering faces or important subjects.
- Never write "News Desk", "Newsdesk", "News Update" as a brand, or any other outlet/page name.
- Only render the provided person name if the original image has a non-brand person/name-tag area. Do not treat the person name as a page/source brand.
- If the uploaded reference image does not visibly include a date, date label, or date bar, do not add any date anywhere, even if a date value is provided.
- If the uploaded reference image does visibly include a date/date bar, replace that date with the provided date when available; if no replacement date is provided, omit the date text instead of inventing one.
- All news/editorial text (headlines, captions, dates, person labels) must be pure white for high readability against the themed colored backgrounds. The only colored text exception is the PhViralHub brand mark.
- Make the final image noticeably more intense than the reference: sharper faces, strong color contrast using the flag palette, and a high-impact tabloid/editorial finish.
- Keep skin tones natural enough to recognize people; do not over-smooth faces or distort identities.
- Keep the same people, faces, poses, composition, and background arrangement as much as the image model allows.
- Preserve the reference layout style, but adapt it to fit the new Philippine Flag color scheme and replace editorial text with the supplied fields where applicable.`;
}

export function buildCaptionPrompt(fields: GeneratePostRequestFields): string {
  return `${BASE_CAPTION_PROMPT}

Return JSON only with this shape:
{
  "caption": "Strong headline plus 3-6 short paragraphs and one engagement question.",
  "hashtags": ["#Tag1", "#Tag2"]
}

Optional context:
- Date: ${fields.date || "not provided"}
- Main headline: ${fields.headline || "not provided"}
- Person/source name: ${fields.personName || "not provided"}
- Tone: ${fields.tone}

Article:
${fields.article}`;
}

export function getBaseImagePrompt(): string {
  return BASE_IMAGE_PROMPT;
}

export function getBaseCaptionPrompt(): string {
  return BASE_CAPTION_PROMPT;
}
