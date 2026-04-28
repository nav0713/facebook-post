"use client";

import { useRef, useState } from "react";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

export default function ImageUploader({
  file,
  previewUrl,
  disabled,
  onChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pasteZoneRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    const pastedFile = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();

    if (!pastedFile) return;

    event.preventDefault();
    onChange(
      new File([pastedFile], `pasted-news-image-${Date.now()}.png`, {
        type: pastedFile.type || "image/png",
      }),
    );
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (droppedFile) onChange(droppedFile);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Input image
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Paste news-style image
          </h2>
        </div>
        {file && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            disabled={disabled}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      <div
        ref={pasteZoneRef}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Paste an image from your clipboard"
        onPaste={handlePaste}
        onClick={() => pasteZoneRef.current?.focus()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 flex min-h-[260px] cursor-text flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center outline-none transition focus:ring-4 focus:ring-red-100 ${
          isDragging
            ? "border-red-400 bg-red-50"
            : "border-slate-300 bg-slate-50 hover:border-red-300 hover:bg-red-50/40"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          id="post-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="w-full space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Uploaded news post preview"
              className="mx-auto max-h-[360px] w-full rounded-lg object-contain"
            />
            <p className="truncate text-xs font-semibold text-slate-500">
              {file?.name}
            </p>
          </div>
        ) : (
          <div className="max-w-xs space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
              ⌘V
            </div>
            <p className="text-sm font-bold text-slate-900">
              Paste image here
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              Copy an image, click this box, then press Cmd+V or Ctrl+V.
              Drag/drop also works.
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={disabled}
              className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:opacity-50"
            >
              Choose file instead
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
