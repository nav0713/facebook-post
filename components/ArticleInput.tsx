"use client";

import type { OutputSize, PostTone } from "@/types/news-post";

interface ArticleInputProps {
  article: string;
  date: string;
  headline: string;
  personName: string;
  tone: PostTone;
  outputSize: OutputSize;
  disabled: boolean;
  onArticleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onHeadlineChange: (value: string) => void;
  onPersonNameChange: (value: string) => void;
  onToneChange: (value: PostTone) => void;
  onOutputSizeChange: (value: OutputSize) => void;
}

const toneOptions: Array<{ value: PostTone; label: string }> = [
  { value: "dramatic", label: "Dramatic" },
  { value: "intense", label: "Intense" },
  { value: "neutral", label: "Neutral" },
];

const sizeOptions: Array<{ value: OutputSize; label: string }> = [
  { value: "1080x1080", label: "1080 x 1080" },
  { value: "1080x1350", label: "1080 x 1350" },
  { value: "1920x1080", label: "1920 x 1080" },
];

export default function ArticleInput({
  article,
  date,
  headline,
  personName,
  tone,
  outputSize,
  disabled,
  onArticleChange,
  onDateChange,
  onHeadlineChange,
  onPersonNameChange,
  onToneChange,
  onOutputSizeChange,
}: ArticleInputProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
          Optional article and details
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-950">
          Caption source
        </h2>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-slate-800">
            Article <span className="font-semibold text-slate-400">(optional)</span>
          </span>
          <textarea
            value={article}
            onChange={(event) => onArticleChange(event.target.value)}
            disabled={disabled}
            rows={11}
            placeholder="Paste the full article here if you want a caption..."
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100 disabled:opacity-60"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              disabled={disabled}
              placeholder="April 26, 2026"
              className="field-input"
            />
          </Field>

          <Field label="Person/source name">
            <input
              value={personName}
              onChange={(event) => onPersonNameChange(event.target.value)}
              disabled={disabled}
              placeholder="Name or source"
              className="field-input"
            />
          </Field>
        </div>

        <Field label="Main headline">
          <input
            value={headline}
            onChange={(event) => onHeadlineChange(event.target.value)}
            disabled={disabled}
            placeholder="Optional headline replacement"
            className="field-input"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tone">
            <select
              value={tone}
              onChange={(event) => onToneChange(event.target.value as PostTone)}
              disabled={disabled}
              className="field-input"
            >
              {toneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Output size">
            <select
              value={outputSize}
              onChange={(event) =>
                onOutputSizeChange(event.target.value as OutputSize)
              }
              disabled={disabled}
              className="field-input"
            >
              {sizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
