"use client";

import { useState } from "react";

const CANVAS_SIZE = 1080;
const SAFE_PAD = 76;
const LOGO_SIZE = 104;
const TITLE_TOP = 728;
const HEADLINE_MAX_WORDS = 12;
const SUBCONTENT_TOP_GAP = 30;

interface GraphicGeneratorProps {
  imageUrl: string | null;
  taglishTitle: string | null;
  what: string | null;
  summary: string | null;
  hashtags: string[];
}

type Status = "idle" | "generating" | "done" | "error";
type PostStatus = "idle" | "posting" | "posted" | "post-error";

export default function GraphicGenerator({ imageUrl, taglishTitle, what, summary, hashtags }: GraphicGeneratorProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<PostStatus>("idle");
  const [postError, setPostError] = useState<string | null>(null);

  const generate = async () => {
    setStatus("generating");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Base fill
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      await Promise.all([
        document.fonts.load("400 92px Anton"),
        document.fonts.load("500 32px JetBrains Mono"),
      ]);

      let hasArticleImage = false;

      // Article image as a full-bleed, editorial background.
      if (imageUrl) {
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error("Image proxy failed");
          const blob = await res.blob();
          const bitmap = await createImageBitmap(blob);

          const { naturalWidth: iw, naturalHeight: ih } = { naturalWidth: bitmap.width, naturalHeight: bitmap.height };
          const targetW = CANVAS_SIZE;
          const targetH = CANVAS_SIZE;
          const scale = Math.max(targetW / iw, targetH / ih);
          const drawW = iw * scale;
          const drawH = ih * scale;
          const offsetX = (targetW - drawW) / 2;
          const offsetY = (targetH - drawH) / 2;

          ctx.save();
          ctx.filter = "brightness(1.24) contrast(1.04) saturate(1.1)";
          ctx.beginPath();
          ctx.rect(0, 0, targetW, targetH);
          ctx.clip();
          ctx.drawImage(bitmap, offsetX, offsetY, drawW, drawH);
          ctx.restore();
          hasArticleImage = true;
        } catch {
          drawFallbackBackground(ctx);
        }
      } else {
        drawFallbackBackground(ctx);
      }

      if (hasArticleImage) {
        sharpenCanvas(ctx, 0.2);
      }

      drawEditorialOverlays(ctx);
      drawAccentRule(ctx);

      // Logo badge
      try {
        const logo = await loadImage("/assets/logo.png");
        const logoX = CANVAS_SIZE - LOGO_SIZE - SAFE_PAD;
        const logoY = SAFE_PAD;
        const logoCX = logoX + LOGO_SIZE / 2;
        const logoCY = logoY + LOGO_SIZE / 2;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "rgba(7,10,14,0.76)";
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, LOGO_SIZE / 2 + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, LOGO_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE);
        ctx.restore();
      } catch {
        // No logo — skip
      }

      const titleLayout = drawTitle(ctx, taglishTitle ?? "");
      drawSubcontent(ctx, what, titleLayout.bottom + SUBCONTENT_TOP_GAP);

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

          {/* Download + regenerate */}
          <div className="flex gap-3">
            <button
              onClick={download}
              className="flex-1 py-3 rounded-xl bg-[#c9a84c] text-[#080806] font-bold text-sm tracking-wide hover:bg-[#e0be6a] transition-colors"
            >
              I-download (1080×1080)
            </button>
            <button
              onClick={() => { setStatus("idle"); setDataUrl(null); setPostStatus("idle"); }}
              className="px-4 py-3 rounded-xl border border-[#2e2b1e] text-[#7a7468] text-sm hover:text-[#c5c0b4] transition-colors"
            >
              Muli
            </button>
          </div>

          {/* Facebook post */}
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

function toBoldUnicode(text: string): string {
  return Array.from(text).map((char) => {
    const c = char.codePointAt(0)!;
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65);  // A-Z
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97); // a-z
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48);  // 0-9
    return char;
  }).join("");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  grad.addColorStop(0, "#27303a");
  grad.addColorStop(0.48, "#111923");
  grad.addColorStop(1, "#0a0f16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
  ctx.fillRect(0, 0, 18, CANVAS_SIZE);
}

function drawEditorialOverlays(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(5, 8, 12, 0.12)";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, CANVAS_SIZE, 360);

  const bottom = ctx.createLinearGradient(0, 260, 0, CANVAS_SIZE);
  bottom.addColorStop(0, "rgba(5,8,12,0)");
  bottom.addColorStop(0.55, "rgba(5,8,12,0.38)");
  bottom.addColorStop(1, "rgba(5,8,12,0.78)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 260, CANVAS_SIZE, CANVAS_SIZE - 260);

  const left = ctx.createLinearGradient(0, 0, CANVAS_SIZE, 0);
  left.addColorStop(0, "rgba(5,8,12,0.26)");
  left.addColorStop(0.5, "rgba(5,8,12,0.03)");
  left.addColorStop(1, "rgba(5,8,12,0.14)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function sharpenCanvas(ctx: CanvasRenderingContext2D, amount: number) {
  try {
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const stride = CANVAS_SIZE * 4;

    for (let y = 1; y < CANVAS_SIZE - 1; y += 1) {
      for (let x = 1; x < CANVAS_SIZE - 1; x += 1) {
        const i = y * stride + x * 4;
        const top = i - stride;
        const bottom = i + stride;
        const left = i - 4;
        const right = i + 4;

        for (let c = 0; c < 3; c += 1) {
          out[i + c] =
            src[i + c] * (1 + amount * 4) -
            (src[top + c] + src[bottom + c] + src[left + c] + src[right + c]) * amount;
        }
      }
    }

    imageData.data.set(out);
    ctx.putImageData(imageData, 0, 0);
  } catch {
    // If a browser blocks pixel access, keep the already enhanced image.
  }
}

function drawAccentRule(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4c430";
  ctx.fillRect(SAFE_PAD, 690, 148, 10);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string): { bottom: number } {
  const lines = buildTwoLineHeadline(title);
  const fit = fitTwoLineTitle(ctx, lines);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  ctx.font = `400 ${fit.fontSize}px Anton`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(fit.lines[0], SAFE_PAD, TITLE_TOP);

  ctx.fillStyle = "#ffd23f";
  ctx.fillText(fit.lines[1], SAFE_PAD, TITLE_TOP + fit.lineHeight);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return { bottom: TITLE_TOP + fit.lineHeight * 2 };
}

function drawSubcontent(ctx: CanvasRenderingContext2D, what: string | null, top: number) {
  const clean = cleanSubcontent(what);
  if (!clean) return;

  const maxWidth = CANVAS_SIZE - SAFE_PAD * 2;
  const maxHeight = CANVAS_SIZE - SAFE_PAD - top;
  const fit = fitSubcontent(ctx, clean, maxWidth, maxHeight);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.font = `500 ${fit.fontSize}px JetBrains Mono`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";

  fit.lines.forEach((line, index) => {
    ctx.fillText(line, SAFE_PAD, top + index * fit.lineHeight);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function cleanSubcontent(text: string | null): string | null {
  if (!text?.trim()) return null;

  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[\s:|,-]*(ano|what)\s*[:|-]\s*/i, "")
    .trim();

  return cleaned || null;
}

function buildTwoLineHeadline(title: string): [string, string] {
  const cleaned = cleanHeadline(title);
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, HEADLINE_MAX_WORDS);

  if (words.length === 0) return ["NEWS", "UPDATE"];
  if (words.length === 1) return [words[0], "UPDATE"];

  const splitAt = findBalancedSplit(words);
  return [
    words.slice(0, splitAt).join(" "),
    words.slice(splitAt).join(" "),
  ];
}

function cleanHeadline(title: string): string {
  const cleaned = title
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s:|,-]*(breaking|latest|update|just in|look|watch|read|alam[in]?|viral)\s*[:|-]\s*/i, "")
    .trim();

  return cleaned || title.trim();
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
    const balanceScore = Math.abs(firstChars - secondChars);
    const topHeavyPenalty = firstChars > secondChars ? 8 : 0;
    const score = balanceScore + topHeavyPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function fitTwoLineTitle(
  ctx: CanvasRenderingContext2D,
  lines: [string, string],
): { lines: [string, string]; fontSize: number; lineHeight: number } {
  const maxWidth = CANVAS_SIZE - SAFE_PAD * 2;
  const maxHeight = 172;
  const minFontSize = 46;

  for (let fontSize = 86; fontSize >= minFontSize; fontSize -= 2) {
    ctx.font = `400 ${fontSize}px Anton`;
    const lineHeight = Math.round(fontSize * 1.05);
    const fits = lines.every((line) => ctx.measureText(line).width <= maxWidth);
    if (fits && lineHeight * 2 <= maxHeight) {
      return { lines, fontSize, lineHeight };
    }
  }

  ctx.font = `400 ${minFontSize}px Anton`;
  return {
    lines: [
      trimToWidth(ctx, lines[0], maxWidth),
      trimToWidth(ctx, lines[1], maxWidth),
    ],
    fontSize: minFontSize,
    lineHeight: Math.round(minFontSize * 1.08),
  };
}

function trimToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1).trimEnd();
  }

  return `${result}...`;
}

function fitSubcontent(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
): { lines: string[]; fontSize: number; lineHeight: number } {
  const maxLines = 4;

  for (let fontSize = 30; fontSize >= 14; fontSize -= 1) {
    ctx.font = `500 ${fontSize}px JetBrains Mono`;
    const lineHeight = Math.round(fontSize * 1.35);
    const lines = wrapText(ctx, text, maxWidth);

    if (lines.length <= maxLines && lines.length * lineHeight <= maxHeight) {
      return { lines, fontSize, lineHeight };
    }
  }

  const fontSize = 14;
  ctx.font = `500 ${fontSize}px JetBrains Mono`;
  return {
    lines: wrapText(ctx, text, maxWidth),
    fontSize,
    lineHeight: Math.round(fontSize * 1.35),
  };
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

    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
