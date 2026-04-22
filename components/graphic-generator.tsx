"use client";

import { useState } from "react";

const BRAND_HANDLE = "PhViralHub";
const CANVAS_SIZE = 1080;
const IMAGE_HEIGHT = 648;
const BAR_START = 980;
const SIDE_PAD = 60;

interface GraphicGeneratorProps {
  imageUrl: string | null;
  taglishTitle: string | null;
}

type Status = "idle" | "generating" | "done" | "error";

export default function GraphicGenerator({ imageUrl, taglishTitle }: GraphicGeneratorProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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
      ctx.fillRect(0, IMAGE_HEIGHT, CANVAS_SIZE, BAR_START - IMAGE_HEIGHT);

      // Logo badge (optional — loaded from /assets/logo.png)
      try {
        const logo = await loadImage("/assets/logo.png");
        const logoSize = 110;
        const logoX = (CANVAS_SIZE - logoSize) / 2;
        const logoY = IMAGE_HEIGHT - logoSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      } catch {
        // No logo — skip
      }

      // Title text
      drawTitle(ctx, taglishTitle ?? "");

      // Bottom bar
      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, BAR_START, CANVAS_SIZE, CANVAS_SIZE - BAR_START);

      // Gold separator line
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(0, BAR_START, CANVAS_SIZE, 2);

      // Social handles
      ctx.font = "400 32px Anton";
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      const barMid = BAR_START + (CANVAS_SIZE - BAR_START) / 2;
      ctx.textAlign = "left";
      ctx.fillText(`f  ${BRAND_HANDLE}`, SIDE_PAD, barMid);
      ctx.textAlign = "right";
      ctx.fillText(`@${BRAND_HANDLE}`, CANVAS_SIZE - SIDE_PAD, barMid);

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
              onClick={() => { setStatus("idle"); setDataUrl(null); }}
              className="px-4 py-3 rounded-xl border border-[#2e2b1e] text-[#7a7468] text-sm hover:text-[#c5c0b4] transition-colors"
            >
              Muli
            </button>
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
  const firstPart = words.slice(0, splitAt);
  const secondPart = words.slice(splitAt);

  const maxWidth = CANVAS_SIZE - SIDE_PAD * 2;
  const textAreaTop = IMAGE_HEIGHT + 60; // extra space for logo
  const textAreaBottom = BAR_START - 30;

  // Measure and wrap both parts
  ctx.font = "400 68px Anton";
  const firstLines = wrapWords(ctx, firstPart, maxWidth);
  ctx.font = "400 76px Anton";
  const secondLines = wrapWords(ctx, secondPart, maxWidth);

  const lineHeightFirst = 78;
  const lineHeightSecond = 88;
  const gap = 18;

  const totalHeight =
    firstLines.length * lineHeightFirst +
    (firstLines.length > 0 && secondLines.length > 0 ? gap : 0) +
    secondLines.length * lineHeightSecond;

  const availableHeight = textAreaBottom - textAreaTop;
  let y = textAreaTop + Math.max(0, (availableHeight - totalHeight) / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  if (firstLines.length > 0) {
    ctx.font = "400 68px Anton";
    ctx.fillStyle = "#ffffff";
    for (const line of firstLines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += lineHeightFirst;
    }
    y += gap;
  }

  if (secondLines.length > 0) {
    ctx.font = "400 76px Anton";
    ctx.fillStyle = "#FFD700";
    for (const line of secondLines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += lineHeightSecond;
    }
  }
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
