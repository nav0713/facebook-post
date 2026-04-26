"use client";

interface OutputPreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
  isPlaceholder: boolean;
}

export default function OutputPreview({
  imageUrl,
  isLoading,
  isPlaceholder,
}: OutputPreviewProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Regenerated image
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Clean editorial preview
          </h2>
        </div>
        {imageUrl && (
          <a
            href={imageUrl}
            download="news-post-recreated.png"
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700"
          >
            Download image
          </a>
        )}
      </div>

      <div className="mt-4 flex min-h-[430px] items-center justify-center rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#eef2f7)] p-3">
        {isLoading ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="mx-auto h-52 w-52 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mx-auto h-3 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="mx-auto h-3 w-32 animate-pulse rounded-full bg-slate-200" />
          </div>
        ) : imageUrl ? (
          <div className="w-full space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Regenerated news post"
              className="mx-auto max-h-[620px] w-full rounded-lg object-contain shadow-xl"
            />
            {isPlaceholder && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Placeholder mode is active. Add GEMINI_API_KEY to generate the
                final AI-edited image.
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-xs text-center">
            <p className="text-sm font-bold text-slate-700">
              Your recreated image will appear here.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              The output removes branding and applies the serious editorial
              news treatment.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
