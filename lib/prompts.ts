import type { GeneratePostRequestFields } from "@/types/news-post";

const BASE_IMAGE_PROMPT =
  "Recreate the uploaded news-style social media image while removing all visible original branding, logos, usernames, watermarks, page marks, outlet labels, and source/page names. Preserve the main people, facial expressions, composition, background arrangement, and editorial layout. Apply an extremely dramatic, intense, punchy cinematic news-poster filter with very high contrast, crushed deep blacks, moody shadows, bright controlled highlights, subtle film grain, heavy cinematic vignette, sharpened facial details, crisp edge definition, slight clarity boost, mild desaturation except strong red accents, and a serious urgent breaking-news mood. Keep the design clean and professional. Replace text dynamically with the provided headline where the original layout has a matching text area. Add one small clean brand text mark that says PhViralHub using Philippine flag colors. Output square 1080x1080.";

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
- Do not copy or recreate any original publication logo, username, social handle, watermark, page mark, URL, QR code, or brand badge.
- Remove original publication/page/source branding areas cleanly or replace those areas with generic red/black design shapes.
- Add exactly one replacement brand mark with the exact text "PhViralHub". Do not add any other outlet/page/source labels, usernames, watermarks, or brand identities.
- Style the PhViralHub text using Philippine flag colors: royal blue, red, yellow sun/star accent, and white. Keep it compact, professional, and placed like a small page brand label without covering faces or important subjects.
- Never write "News Desk", "Newsdesk", "News Update" as a brand, or any other outlet/page name.
- Only render the provided person name if the original image has a non-brand person/name-tag area. Do not treat the person name as a page/source brand.
- If the uploaded reference image does not visibly include a date, date label, or date bar, do not add any date anywhere, even if a date value is provided.
- If the uploaded reference image does visibly include a date/date bar, replace that date with the provided date when available; if no replacement date is provided, omit the date text instead of inventing one.
- All news/editorial text rendered in the regenerated image must be pure white. Do not use yellow, red, cream, gray, black, or colored text for headlines, captions, dates, or person labels. The only colored text exception is the PhViralHub brand mark using Philippine flag colors.
- Make the final image noticeably more intense than the reference: stronger shadows, harder contrast, punchier red accent bars/shapes, darker corners, sharper faces, and a high-impact tabloid/editorial news poster finish.
- Keep skin tones natural enough to recognize people; do not over-smooth faces or distort identities.
- Keep the same people, faces, poses, composition, and background arrangement as much as the image model allows.
- Preserve the reference layout style, but replace editorial text with the supplied fields where applicable.
- Use only clean professional news design elements with red accents behind or around text, not colored typography.`;
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
