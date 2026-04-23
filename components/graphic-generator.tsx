"use client";

import { useState } from "react";

const CANVAS_SIZE = 1080;
const IMAGE_HEIGHT = 700;
const SIDE_PAD = 60;

interface GraphicGeneratorProps {
  imageUrl: string | null;
  taglishTitle: string | null;
  summary: string | null;
}

type Status = "idle" | "generating" | "done" | "error";
type PostStatus = "idle" | "posting" | "posted" | "post-error";

export default function GraphicGenerator({ imageUrl, taglishTitle, summary }: GraphicGeneratorProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<PostStatus>("idle");
  const [postError, setPostError] = useState<string | null>(null);

  const generate = async () => {
    setStatus("generating");
    try {
      await document.fonts.load("400 72px Anton");

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Base fill
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Article image (top section, cover-crop)
      if (imageUrl) {
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
          const res = await fetch(proxyUrl);
          const blob = await res.blob();
          const bitmap = await createImageBitmap(blob);

          const { naturalWidth: iw, naturalHeight: ih } = { naturalWidth: bitmap.width, naturalHeight: bitmap.height };
          const targetW = CANVAS_SIZE;
          const targetH = IMAGE_HEIGHT;
          const scale = Math.max(targetW / iw, targetH / ih);
          const drawW = iw * scale;
          const drawH = ih * scale;
          const offsetX = (targetW - drawW) / 2;
          const offsetY = (targetH - drawH) / 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, targetW, targetH);
          ctx.clip();
          ctx.drawImage(bitmap, offsetX, offsetY, drawW, drawH);
          ctx.restore();

          // Dark gradient at the bottom of the image to blend into text area
          const grad = ctx.createLinearGradient(0, IMAGE_HEIGHT - 120, 0, IMAGE_HEIGHT);
          grad.addColorStop(0, "rgba(17,17,17,0)");
          grad.addColorStop(1, "rgba(17,17,17,0.85)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, IMAGE_HEIGHT - 120, CANVAS_SIZE, 120);
        } catch {
          // Image failed — leave dark top
        }
      }

      // Text area background
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, IMAGE_HEIGHT, CANVAS_SIZE, CANVAS_SIZE - IMAGE_HEIGHT);

      // Logo badge — top right corner of the article image
      try {
        const logo = await loadImage("/assets/logo.png");
        const logoSize = 120;
        const logoPad = 20;
        const logoX = CANVAS_SIZE - logoSize - logoPad;
        const logoY = logoPad;
        const logoCX = logoX + logoSize / 2;
        const logoCY = logoY + logoSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      } catch {
        // No logo — skip
      }

      // Title text
      drawTitle(ctx, taglishTitle ?? "");

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
    const titlePart = taglishTitle ? `**${taglishTitle}**` : null;
    const caption = [titlePart, summary].filter(Boolean).join("\n\n");
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string) {
  if (!title.trim()) return;

  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const splitAt = Math.max(1, Math.ceil(words.length * 0.45));
  const firstWords = words.slice(0, splitAt);
  const secondWords = words.slice(splitAt);

  const maxWidth = CANVAS_SIZE - SIDE_PAD * 2;
  const textAreaTop = IMAGE_HEIGHT + 50;
  const textAreaBottom = CANVAS_SIZE - 50;
  const availableHeight = textAreaBottom - textAreaTop;

  const fit = fitText(ctx, firstWords, secondWords, maxWidth, availableHeight);

  const totalHeight =
    fit.firstLines.length * fit.lh1 +
    fit.gap +
    fit.secondLines.length * fit.lh2;

  let y = textAreaTop + Math.max(0, (availableHeight - totalHeight) / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  if (fit.firstLines.length > 0) {
    ctx.font = `400 ${fit.fs1}px Anton`;
    ctx.fillStyle = "#ffffff";
    for (const line of fit.firstLines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += fit.lh1;
    }
    y += fit.gap;
  }

  if (fit.secondLines.length > 0) {
    ctx.font = `400 ${fit.fs2}px Anton`;
    ctx.fillStyle = "#FFD700";
    for (const line of fit.secondLines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += fit.lh2;
    }
  }
}

interface FitResult {
  firstLines: string[];
  secondLines: string[];
  fs1: number;
  fs2: number;
  lh1: number;
  lh2: number;
  gap: number;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  firstWords: string[],
  secondWords: string[],
  maxWidth: number,
  availableHeight: number,
): FitResult {
  // Step down from 100% scale until all text fits, then use that scale.
  for (let scale = 1.0; scale >= 0.28; scale -= 0.04) {
    const fs1 = Math.round(68 * scale);
    const fs2 = Math.round(76 * scale);
    const lh1 = Math.round(fs1 * 1.18);
    const lh2 = Math.round(fs2 * 1.18);
    const gap =
      firstWords.length > 0 && secondWords.length > 0
        ? Math.round(16 * scale)
        : 0;

    ctx.font = `400 ${fs1}px Anton`;
    const firstLines = wrapWords(ctx, firstWords, maxWidth);
    ctx.font = `400 ${fs2}px Anton`;
    const secondLines = wrapWords(ctx, secondWords, maxWidth);

    const totalH =
      firstLines.length * lh1 + gap + secondLines.length * lh2;

    if (totalH <= availableHeight) {
      return { firstLines, secondLines, fs1, fs2, lh1, lh2, gap };
    }
  }

  // Absolute fallback — min sizes
  const fs1 = 20;
  const fs2 = 22;
  ctx.font = `400 ${fs1}px Anton`;
  const firstLines = wrapWords(ctx, firstWords, maxWidth);
  ctx.font = `400 ${fs2}px Anton`;
  const secondLines = wrapWords(ctx, secondWords, maxWidth);
  return { firstLines, secondLines, fs1, fs2, lh1: 24, lh2: 26, gap: 8 };
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string[] {
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
