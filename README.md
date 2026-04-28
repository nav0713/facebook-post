# News Post Recreator

Next.js app for recreating news-style social media posts without original branding, logos, usernames, watermarks, or page marks. It also rewrites pasted articles into factual Tagalog/Taglish Facebook captions with hashtags.

## Features

- Image upload preview
- Optional article input for caption generation
- Optional date, headline, person/source name, tone, and output size controls
- Gemini generation endpoint at `/api/generate`
- Reusable prompt builders in `lib/prompts.ts`
- Output panel with regenerated image preview, caption, hashtags, copy caption, and download image
- Placeholder mode when `GEMINI_API_KEY` is not configured

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local` manually if `.env.example` does not exist:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_TEXT_MODEL=gemini-2.5-flash
```

Only `GEMINI_API_KEY` is required. The model variables are optional overrides.

## API Notes

`POST /api/generate` expects multipart form data:

- `image`
- `article` (optional; omit for image-only generation)
- `headline`
- `date`
- `personName`
- `tone`
- `outputSize`

When `GEMINI_API_KEY` is present, the route sends the uploaded image and image prompt to Gemini image generation, then sends the article prompt to a Gemini text model for the caption JSON. Without a key, it returns a local placeholder image and fallback caption so the UI remains testable.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
