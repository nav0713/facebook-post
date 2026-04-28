"use client";

import { useMemo, useState } from "react";

interface CaptionBoxProps {
  caption: string;
  hashtags: string[];
  isLoading: boolean;
}

export default function CaptionBox({
  caption,
  hashtags,
  isLoading,
}: CaptionBoxProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const fullCaption = useMemo(
    () => [caption, hashtags.join(" ")].filter(Boolean).join("\n\n"),
    [caption, hashtags],
  );

  const copyCaption = async () => {
    if (!fullCaption) return;

    try {
      await navigator.clipboard.writeText(fullCaption);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Facebook caption
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Tagalog/Taglish post copy
          </h2>
        </div>
        <button
          type="button"
          onClick={copyCaption}
          disabled={!fullCaption || isLoading}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:opacity-50"
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy caption"}
        </button>
      </div>

      <div className="mt-4 min-h-[300px] rounded-xl border border-slate-200 bg-slate-50 p-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
          </div>
        ) : fullCaption ? (
          <div className="space-y-5">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
              {caption}
            </pre>
            {hashtags.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Hashtags
                </p>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            The rewritten caption and hashtags will appear here after
            generation.
          </p>
        )}
      </div>
    </section>
  );
}
