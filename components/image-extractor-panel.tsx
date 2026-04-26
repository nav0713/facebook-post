"use client";

import { useEffect, useMemo, useState } from "react";
import ArticleInput from "@/components/ArticleInput";
import CaptionBox from "@/components/CaptionBox";
import ImageUploader from "@/components/ImageUploader";
import OutputPreview from "@/components/OutputPreview";
import type {
  GeneratePostResponse,
  GeneratedPostResult,
  OutputSize,
  PostTone,
} from "@/types/news-post";

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: GeneratedPostResult };

export default function ImageExtractorPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [article, setArticle] = useState("");
  const [date, setDate] = useState("");
  const [headline, setHeadline] = useState("");
  const [personName, setPersonName] = useState("");
  const [tone, setTone] = useState<PostTone>("dramatic");
  const [outputSize, setOutputSize] = useState<OutputSize>("1080x1080");
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canGenerate = Boolean(file) && state.status !== "loading";
  const result = state.status === "success" ? state.result : null;
  const error = state.status === "error" ? state.message : null;

  const helperText = useMemo(() => {
    if (!file) return "Upload an image to start.";
    if (!article.trim()) return "Ready to generate image only. Add article for caption.";
    return "Ready to generate image and caption.";
  }, [article, file]);

  const handleFileChange = (nextFile: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setState({ status: "idle" });
  };

  const handleGenerate = async () => {
    if (!file) {
      setState({ status: "error", message: "Please upload an image first." });
      return;
    }

    setState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("article", article);
      formData.append("date", date);
      formData.append("headline", headline);
      formData.append("personName", personName);
      formData.append("tone", tone);
      formData.append("outputSize", outputSize);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as GeneratePostResponse;

      if (!json.success) {
        setState({ status: "error", message: json.error });
        return;
      }

      setState({ status: "success", result: json.data });
    } catch (err: unknown) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Network error. Please try again.",
      });
    }
  };

  return (
    <div className="news-recreator -mx-4 rounded-[2rem] bg-slate-100 px-4 py-6 text-slate-950 shadow-2xl shadow-black/25 sm:mx-0 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
            News Post Recreator
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Rebuild branded news images into clean Facebook posts.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Upload a reference image to generate a no-branding editorial image.
            Add an article when you also want a factual Tagalog/Taglish caption.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold text-slate-500">{helperText}</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="space-y-5">
          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            disabled={state.status === "loading"}
            onChange={handleFileChange}
          />

          <ArticleInput
            article={article}
            date={date}
            headline={headline}
            personName={personName}
            tone={tone}
            outputSize={outputSize}
            disabled={state.status === "loading"}
            onArticleChange={setArticle}
            onDateChange={setDate}
            onHeadlineChange={setHeadline}
            onPersonNameChange={setPersonName}
            onToneChange={setTone}
            onOutputSizeChange={setOutputSize}
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {state.status === "loading" ? "Generating post..." : "Generate Post"}
          </button>
        </div>

        <div className="space-y-5">
          <OutputPreview
            imageUrl={result?.generatedImage ?? null}
            isLoading={state.status === "loading"}
            isPlaceholder={Boolean(result?.isPlaceholder)}
          />

          <CaptionBox
            caption={result?.caption ?? ""}
            hashtags={result?.hashtags ?? []}
            isLoading={state.status === "loading"}
          />
        </div>
      </div>
    </div>
  );
}
