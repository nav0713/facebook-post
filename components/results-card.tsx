"use client";

import type { ExtractionResult, ArticleMetadata } from "@/types/extraction";
import GraphicGenerator from "@/components/graphic-generator";

interface ResultsCardProps {
  data: ExtractionResult;
  metadata: ArticleMetadata;
}

export default function ResultsCard({ data, metadata }: ResultsCardProps) {
  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero: Titles */}
      <div className="rounded-2xl border border-[#c9a84c]/30 bg-[#0f0e0a] p-6 space-y-4">
        {metadata.featuredImage && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={metadata.featuredImage}
              alt="Article featured image"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
            Original Title
          </span>
          <p className="text-[#7a7468] text-sm leading-snug">
            {data.originalTitle ?? "Not available"}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
            Taglish Title
          </span>
          <h2 className="text-[#f0ede6] text-2xl font-bold leading-tight tracking-tight">
            {data.taglishTitle ?? "Hindi makuha ang pamagat"}
          </h2>
        </div>

        {/* Byline */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5a5548] pt-1 border-t border-[#1e1c14]">
          {data.author && <span>✍ {data.author}</span>}
          {data.publishedDate && <span>🗓 {formatDate(data.publishedDate)}</span>}
          {data.source && <span>🌐 {data.source}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <Section label="Buod (Summary)">
          <p className="text-[#c5c0b4] text-sm leading-relaxed">{data.summary}</p>
        </Section>
      )}

      {/* 5W1H */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FiveWField label="Sino (Who)" items={data.who} />
        <FiveWField label="Saan (Where)" items={data.where} />
        {data.what && <FiveWInline label="Ano (What)" value={data.what} />}
        {data.when && <FiveWInline label="Kailan (When)" value={data.when} />}
        {data.why && (
          <div className="sm:col-span-2">
            <FiveWInline label="Bakit (Why)" value={data.why} />
          </div>
        )}
      </div>

      {/* Key Points */}
      {data.keyPoints.length > 0 && (
        <Section label="Key Points">
          <ul className="space-y-2">
            {data.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#c5c0b4] leading-relaxed">
                <span className="text-[#c9a84c] font-bold shrink-0 mt-0.5">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Keywords */}
      {data.keywords.length > 0 && (
        <Section label="Keywords">
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs bg-[#1e1c14] border border-[#2e2b1e] text-[#a09880] font-mono"
              >
                {kw}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Graphic Generator */}
      <GraphicGenerator
        imageUrl={metadata.featuredImage}
        taglishTitle={data.taglishTitle}
        summary={data.summary}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#1e1c14] bg-[#0b0b08] p-5 space-y-3">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FiveWField({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#1e1c14] bg-[#0b0b08] p-4 space-y-2">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
        {label}
      </span>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[#c5c0b4] leading-snug flex gap-2">
            <span className="text-[#2e2b1e] select-none">▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FiveWInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1e1c14] bg-[#0b0b08] p-4 space-y-2">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
        {label}
      </span>
      <p className="text-sm text-[#c5c0b4] leading-snug">{value}</p>
    </div>
  );
}

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}
