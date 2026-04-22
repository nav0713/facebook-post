"use client";

import { useState } from "react";
import UrlForm from "@/components/url-form";
import ResultsCard from "@/components/results-card";
import type { ExtractResponse, ExtractionResult, ArticleMetadata } from "@/types/extraction";

type AppState =
  | { status: "idle" }
  | { status: "loading"; url: string }
  | { status: "error"; message: string; url: string }
  | { status: "success"; data: ExtractionResult; metadata: ArticleMetadata; url: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  const handleSubmit = async (url: string) => {
    setState({ status: "loading", url });

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json: ExtractResponse = await res.json();

      if (!json.success) {
        setState({ status: "error", message: json.error, url });
        return;
      }

      setState({
        status: "success",
        data: json.data,
        metadata: json.metadata,
        url,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setState({ status: "error", message, url });
    }
  };

  const handleReset = () => setState({ status: "idle" });

  return (
    <main className="min-h-screen bg-[#080806] text-[#f0ede6] px-4 py-16">
      {/* Background texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-12 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center text-[#080806] text-base font-black">
              T
            </div>
            <span className="text-[#4a4740] text-sm font-mono tracking-widest uppercase">
              Taglish News
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-tight text-[#f0ede6]">
            Article<br />
            <span className="text-[#c9a84c]">Extractor</span>
          </h1>

          <p className="text-[#5a5548] text-base leading-relaxed max-w-sm">
            I-paste ang link ng balita. I-a-analyze ng AI ang artikulo at isusulat ang headline sa natural na Taglish.
          </p>
        </header>

        {/* Form */}
        <div className="mb-8">
          <UrlForm
            onSubmit={handleSubmit}
            isLoading={state.status === "loading"}
          />
        </div>

        {/* Loading state */}
        {state.status === "loading" && (
          <LoadingState url={state.url} />
        )}

        {/* Error state */}
        {state.status === "error" && (
          <ErrorState message={state.message} onReset={handleReset} />
        )}

        {/* Success state */}
        {state.status === "success" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[#4a4740] text-xs font-mono truncate max-w-[70%]">
                ↳ {state.url}
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-[#c9a84c] hover:text-[#e0be6a] transition-colors"
              >
                ← Try another
              </button>
            </div>
            <ResultsCard data={state.data} metadata={state.metadata} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-[#1a1810] text-center">
          <p className="text-[#3a3730] text-xs font-mono">
            Powered by Gemini 1.5 Pro · Next.js 14 App Router
          </p>
        </footer>
      </div>
    </main>
  );
}

function LoadingState({ url }: { url: string }) {
  return (
    <div className="rounded-2xl border border-[#1e1c14] bg-[#0b0b08] p-8 space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 bg-[#1e1c14] rounded-full w-24" />
        <div className="h-6 bg-[#1e1c14] rounded-full w-3/4" />
        <div className="h-6 bg-[#c9a84c]/10 rounded-full w-2/3" />
      </div>

      <div className="space-y-2">
        <div className="h-3 bg-[#1e1c14] rounded-full w-full" />
        <div className="h-3 bg-[#1e1c14] rounded-full w-5/6" />
        <div className="h-3 bg-[#1e1c14] rounded-full w-4/5" />
      </div>

      <p className="text-[#4a4740] text-xs font-mono text-center">
        Binabasa ang artikulo mula sa{" "}
        <span className="text-[#c9a84c]">{safeHostname(url)}</span>
        …
      </p>
    </div>
  );
}

function ErrorState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-900/50 bg-[#0f0808] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-xl leading-none mt-0.5">⚠</span>
        <div className="space-y-1">
          <p className="text-red-400 font-semibold text-sm">May nangyaring mali</p>
          <p className="text-[#8a7070] text-sm leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="text-xs text-[#c9a84c] hover:text-[#e0be6a] transition-colors"
      >
        ← Subukan muli
      </button>
    </div>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
