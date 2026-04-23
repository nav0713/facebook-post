"use client";

import { useState } from "react";

const GRAPHIC = {
  size: 1080,
  safeX: 56,
  safeBottom: 48,
  topPad: 24,
  accent: {
    x: 56,
    y: 626,
    width: 168,
    height: 10,
  },
  badge: {
    size: 136,
    ringPadding: 10,
  },
  photo: {
    brightness: 1.18,
    contrast: 1.04,
    saturate: 1.08,
  },
  overlay: {
    topWashHeight: 340,
    lowerBandTop: 608,
    titleVeilTop: 620,
  },
  headline: {
    top: 648,
    maxWords: 12,
    minFontSize: 58,
    maxFontSize: 86,
  },
  detail: {
    gapTop: 18,
    minFontSize: 32,
    maxFontSize: 32,
    maxLines: 4,
  },
} as const;

interface GraphicGeneratorProps {
  imageUrl: string | null;
  taglishTitle: string | null;
  what: string | null;
  summary: string | null;
  hashtags: string[];
}

interface GraphicAssets {
  background: ImageBitmap | null;
  logo: HTMLImageElement | null;
}

type Status = "idle" | "generating" | "done" | "error";
type PostStatus = "idle" | "posting" | "posted" | "post-error";

export default function GraphicGenerator({
  imageUrl,
  taglishTitle,
  what,
  summary,
  hashtags,
}: GraphicGeneratorProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<PostStatus>("idle");
  const [postError, setPostError] = useState<string | null>(null);

  const generate = async () => {
    setStatus("generating");

    try {
      await Promise.all([
        document.fonts.load("400 92px Anton"),
        document.fonts.load("500 32px JetBrains Mono"),
      ]);

      const assets = await loadGraphicAssets(imageUrl);
      const canvas = document.createElement("canvas");
      canvas.width = GRAPHIC.size;
      canvas.height = GRAPHIC.size;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context unavailable");
      }

      renderGraphic(ctx, assets, {
        title: taglishTitle,
        detail: what,
      });

      setDataUrl(canvas.toDataURL("image/png"));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "post-graphic.png";
    a.click();
  };

  const postToFacebook = async () => {
    if (!dataUrl) return;
    setPostStatus("posting");
    setPostError(null);

    const titlePart = taglishTitle ? toBoldUnicode(taglishTitle) : null;
    const hashtagLine = hashtags.length > 0 ? hashtags.join(" ") : null;
    const caption = [titlePart, summary, hashtagLine].filter(Boolean).join("\n\n");

    try {
      const res = await fetch("/api/post-to-facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl, caption }),
      });

      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setPostError(json.error ?? "May nangyaring mali.");
        setPostStatus("post-error");
      } else {
        setPostStatus("posted");
      }
    } catch {
      setPostError("Hindi ma-reach ang server.");
      setPostStatus("post-error");
    }
  };

  return (
    <div className="rounded-2xl border border-[#c9a84c]/30 bg-[#0f0e0a] p-6 space-y-4">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
        Generate Graphic
      </span>

      {status === "idle" && (
        <button
          onClick={generate}
          className="w-full py-3 rounded-xl bg-[#c9a84c] text-[#080806] font-bold text-sm tracking-wide hover:bg-[#e0be6a] transition-colors"
        >
          Gumawa ng Graphic
        </button>
      )}

      {status === "generating" && (
        <div className="flex items-center gap-3 text-[#5a5548] text-sm font-mono">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-[#c9a84c] border-t-transparent rounded-full" />
          Ginagawa ang graphic…
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-red-400 text-sm">Hindi nagawa ang graphic. Subukan muli.</p>
          <button
            onClick={() => setStatus("idle")}
            className="text-xs text-[#c9a84c] hover:text-[#e0be6a] transition-colors"
          >
            ← Bumalik
          </button>
        </div>
      )}

      {status === "done" && dataUrl && (
        <div className="space-y-4">
          <img
            src={dataUrl}
            alt="Generated Facebook post graphic"
            className="w-full rounded-xl border border-[#1e1c14]"
          />

          <div className="flex gap-3">
            <button
              onClick={download}
              className="flex-1 py-3 rounded-xl bg-[#c9a84c] text-[#080806] font-bold text-sm tracking-wide hover:bg-[#e0be6a] transition-colors"
            >
              I-download (1080×1080)
            </button>
            <button
              onClick={() => {
                setStatus("idle");
                setDataUrl(null);
                setPostStatus("idle");
              }}
              className="px-4 py-3 rounded-xl border border-[#2e2b1e] text-[#7a7468] text-sm hover:text-[#c5c0b4] transition-colors"
            >
              Muli
            </button>
          </div>

          <div className="pt-1 border-t border-[#1e1c14] space-y-2">
            {postStatus !== "posted" && (
              <button
                onClick={postToFacebook}
                disabled={postStatus === "posting"}
                className="w-full py-3 rounded-xl bg-[#1877f2] text-white font-bold text-sm tracking-wide hover:bg-[#1565d8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {postStatus === "posting" ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Nipo-post…
                  </>
                ) : (
                  "I-post sa Facebook"
                )}
              </button>
            )}

            {postStatus === "posted" && (
              <p className="text-green-400 text-sm font-mono text-center py-2">
                Na-post na sa Facebook Page!
              </p>
            )}

            {postStatus === "post-error" && (
              <div className="space-y-1">
                <p className="text-red-400 text-xs font-mono">{postError}</p>
                <button
                  onClick={() => setPostStatus("idle")}
                  className="text-xs text-[#c9a84c] hover:text-[#e0be6a] transition-colors"
                >
                  Subukan muli
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function loadGraphicAssets(imageUrl: string | null): Promise<GraphicAssets> {
  const [background, logo] = await Promise.all([
    loadBackgroundBitmap(imageUrl),
    loadImage("/assets/logo.png").catch(() => null),
  ]);

  return { background, logo };
}

async function loadBackgroundBitmap(imageUrl: string | null): Promise<ImageBitmap | null> {
  if (!imageUrl) return null;

  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function renderGraphic(
  ctx: CanvasRenderingContext2D,
  assets: GraphicAssets,
  content: {
    title: string | null;
    detail: string | null;
  },
) {
  fillBase(ctx);
  drawBackdrop(ctx, assets.background);
  drawReferenceOverlays(ctx);
  drawAccentRule(ctx);
  drawBrandBadge(ctx, assets.logo);

  const headline = fitHeadlineBlock(ctx, content.title);
  drawHeadlineBlock(ctx, headline);

  const detailTop = headline.bottom + GRAPHIC.detail.gapTop;
  const detail = fitDetailBlock(ctx, content.detail, detailTop);
  if (detail) {
    drawDetailBlock(ctx, detail, detailTop);
  }
}

function fillBase(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, GRAPHIC.size, GRAPHIC.size);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, background: ImageBitmap | null) {
  if (!background) {
    drawFallbackBackground(ctx);
    return;
  }

  const scale = Math.max(
    GRAPHIC.size / background.width,
    GRAPHIC.size / background.height,
  );
  const drawW = background.width * scale;
  const drawH = background.height * scale;
  const offsetX = (GRAPHIC.size - drawW) / 2;
  const offsetY = (GRAPHIC.size - drawH) / 2;

  ctx.save();
  ctx.filter = `brightness(${GRAPHIC.photo.brightness}) contrast(${GRAPHIC.photo.contrast}) saturate(${GRAPHIC.photo.saturate})`;
  ctx.drawImage(background, offsetX, offsetY, drawW, drawH);
  ctx.restore();
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, GRAPHIC.size, GRAPHIC.size);
  grad.addColorStop(0, "#27303a");
  grad.addColorStop(0.5, "#111923");
  grad.addColorStop(1, "#0a0f16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GRAPHIC.size, GRAPHIC.size);
}

function drawReferenceOverlays(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(8, 11, 17, 0.1)";
  ctx.fillRect(0, 0, GRAPHIC.size, GRAPHIC.size);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, GRAPHIC.size, GRAPHIC.overlay.topWashHeight);

  const lowerBand = ctx.createLinearGradient(
    0,
    GRAPHIC.overlay.lowerBandTop,
    0,
    GRAPHIC.size,
  );
  lowerBand.addColorStop(0, "rgba(0,0,0,0)");
  lowerBand.addColorStop(0.24, "rgba(0,0,0,0.18)");
  lowerBand.addColorStop(0.55, "rgba(0,0,0,0.56)");
  lowerBand.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = lowerBand;
  ctx.fillRect(
    0,
    GRAPHIC.overlay.lowerBandTop,
    GRAPHIC.size,
    GRAPHIC.size - GRAPHIC.overlay.lowerBandTop,
  );

  const titleVeil = ctx.createLinearGradient(
    0,
    GRAPHIC.size,
    0,
    GRAPHIC.overlay.titleVeilTop,
  );
  titleVeil.addColorStop(0, "rgba(0,0,0,0.82)");
  titleVeil.addColorStop(0.36, "rgba(0,0,0,0.58)");
  titleVeil.addColorStop(0.72, "rgba(0,0,0,0.2)");
  titleVeil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = titleVeil;
  ctx.fillRect(
    0,
    GRAPHIC.overlay.titleVeilTop,
    GRAPHIC.size,
    GRAPHIC.size - GRAPHIC.overlay.titleVeilTop,
  );

  const sideShade = ctx.createLinearGradient(0, 0, GRAPHIC.size, 0);
  sideShade.addColorStop(0, "rgba(0,0,0,0.22)");
  sideShade.addColorStop(0.5, "rgba(0,0,0,0.03)");
  sideShade.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = sideShade;
  ctx.fillRect(0, 0, GRAPHIC.size, GRAPHIC.size);
}

function drawAccentRule(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4c430";
  ctx.fillRect(
    GRAPHIC.accent.x,
    GRAPHIC.accent.y,
    GRAPHIC.accent.width,
    GRAPHIC.accent.height,
  );
}

function drawBrandBadge(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  if (!logo) return;

  const x = GRAPHIC.size - GRAPHIC.badge.size - GRAPHIC.topPad;
  const y = GRAPHIC.topPad;
  const cx = x + GRAPHIC.badge.size / 2;
  const cy = y + GRAPHIC.badge.size / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.38)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "rgba(8,10,14,0.74)";
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    GRAPHIC.badge.size / 2 + GRAPHIC.badge.ringPadding,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, GRAPHIC.badge.size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, x, y, GRAPHIC.badge.size, GRAPHIC.badge.size);
  ctx.restore();
}

function fitHeadlineBlock(
  ctx: CanvasRenderingContext2D,
  title: string | null,
): {
  lines: [string, string];
  fontSize: number;
  lineHeight: number;
  bottom: number;
} {
  const lines = buildHeadlineLines(title);
  const maxWidth = GRAPHIC.size - GRAPHIC.safeX * 2;
  const maxHeight = 176;

  for (
    let fontSize = GRAPHIC.headline.maxFontSize;
    fontSize >= GRAPHIC.headline.minFontSize;
    fontSize -= 2
  ) {
    ctx.font = `400 ${fontSize}px Anton`;
    const lineHeight = Math.round(fontSize * 1.05);
    const fitsWidth = lines.every((line) => ctx.measureText(line).width <= maxWidth);
    if (fitsWidth && lineHeight * 2 <= maxHeight) {
      return {
        lines,
        fontSize,
        lineHeight,
        bottom: GRAPHIC.headline.top + lineHeight * 2,
      };
    }
  }

  const fontSize = GRAPHIC.headline.minFontSize;
  ctx.font = `400 ${fontSize}px Anton`;
  const finalLines: [string, string] = [
    trimToWidth(ctx, lines[0], maxWidth),
    trimToWidth(ctx, lines[1], maxWidth),
  ];
  const lineHeight = Math.round(fontSize * 1.08);

  return {
    lines: finalLines,
    fontSize,
    lineHeight,
    bottom: GRAPHIC.headline.top + lineHeight * 2,
  };
}

function drawHeadlineBlock(
  ctx: CanvasRenderingContext2D,
  layout: {
    lines: [string, string];
    fontSize: number;
    lineHeight: number;
  },
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `400 ${layout.fontSize}px Anton`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, Math.round(layout.fontSize * 0.055));
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  const colors = ["#ffe900", "#ffffff"] as const;

  layout.lines.forEach((line, index) => {
    const y = GRAPHIC.headline.top + index * layout.lineHeight;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.strokeText(line, GRAPHIC.safeX, y);
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillText(line, GRAPHIC.safeX, y);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function buildHeadlineLines(title: string | null): [string, string] {
  const cleaned = cleanHeadline(title);
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, GRAPHIC.headline.maxWords);

  if (words.length === 0) return ["NEWS", "UPDATE"];
  if (words.length === 1) return [words[0], "UPDATE"];

  const splitAt = findBalancedSplit(words);
  return [
    words.slice(0, splitAt).join(" "),
    words.slice(splitAt).join(" "),
  ];
}

function cleanHeadline(title: string | null): string {
  const cleaned = (title ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(
      /^[\s:|,-]*(breaking|latest|update|just in|look|watch|read|alam[in]?|viral)\s*[:|-]\s*/i,
      "",
    )
    .trim();

  return cleaned || "NEWS UPDATE";
}

function findBalancedSplit(words: string[]): number {
  const totalChars = words.join("").length;
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  let runningChars = 0;

  for (let i = 1; i < words.length; i += 1) {
    runningChars += words[i - 1].length;
    const firstChars = runningChars + i - 1;
    const secondChars = totalChars - runningChars + words.length - i - 1;
    const score = Math.abs(firstChars - secondChars) + (firstChars > secondChars ? 8 : 0);

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function fitDetailBlock(
  ctx: CanvasRenderingContext2D,
  detail: string | null,
  top: number,
): {
  lines: string[];
  fontSize: number;
  lineHeight: number;
} | null {
  const candidates = buildDetailCandidates(detail);
  if (candidates.length === 0) return null;

  const maxWidth = GRAPHIC.size - GRAPHIC.safeX * 2;
  const maxHeight = GRAPHIC.size - GRAPHIC.safeBottom - top;
  const maxLines = GRAPHIC.detail.maxLines;

  for (
    let fontSize = GRAPHIC.detail.maxFontSize;
    fontSize >= GRAPHIC.detail.minFontSize;
    fontSize -= 1
  ) {
    ctx.font = `500 ${fontSize}px JetBrains Mono`;
    const lineHeight = Math.round(fontSize * 1.32);

    for (const candidate of candidates) {
      const lines = wrapText(ctx, candidate, maxWidth);
      if (
        lines.length <= maxLines &&
        lines.length * lineHeight <= maxHeight
      ) {
        return { lines, fontSize, lineHeight };
      }
    }
  }

  const fallback = candidates[candidates.length - 1];
  if (!fallback) return null;

  const fontSize = GRAPHIC.detail.minFontSize;
  ctx.font = `500 ${fontSize}px JetBrains Mono`;
  return {
    lines: wrapText(ctx, fallback, maxWidth).slice(0, maxLines),
    fontSize,
    lineHeight: Math.round(fontSize * 1.32),
  };
}

function drawDetailBlock(
  ctx: CanvasRenderingContext2D,
  layout: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
  },
  top: number,
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `500 ${layout.fontSize}px JetBrains Mono`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;

  layout.lines.forEach((line, index) => {
    ctx.fillText(line, GRAPHIC.safeX, top + index * layout.lineHeight);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function buildDetailCandidates(detail: string | null): string[] {
  const cleaned = normalizeDetailText(detail);
  if (!cleaned) return [];

  return [cleaned];
}

function normalizeDetailText(text: string | null): string | null {
  if (!text?.trim()) return null;

  const cleaned = text
    .replace(/^[\s:|,-]*(ano|what)\s*[:|-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function trimToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1).trimEnd();
  }

  return `${result}...`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toBoldUnicode(text: string): string {
  return Array.from(text)
    .map((char) => {
      const c = char.codePointAt(0)!;
      if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65);
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97);
      if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48);
      return char;
    })
    .join("");
}
