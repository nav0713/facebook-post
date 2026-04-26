"use client";

import { useRef } from "react";

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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Input image
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Upload news-style image
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

      <label
        htmlFor="post-image-upload"
        className="mt-4 flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-red-300 hover:bg-red-50/40"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
              +
            </div>
            <p className="text-sm font-bold text-slate-900">
              Drop or choose an image
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              JPG, PNG, or WEBP up to 12MB. Branding will be removed by the AI
              image edit step.
            </p>
          </div>
        )}
      </label>
    </section>
  );
}
