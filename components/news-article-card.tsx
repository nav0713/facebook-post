"use client";

import type { NewsArticle } from "@/types/news";

interface NewsArticleCardProps {
  article: NewsArticle;
  onSelect: (url: string) => void;
}

export default function NewsArticleCard({ article, onSelect }: NewsArticleCardProps) {
  const handleClick = () => {
    onSelect(article.url);
  };

  const relativeTime = formatRelativeTime(article.published_at || article.created_at);

  return (
    <button
      onClick={handleClick}
      className="flex flex-col overflow-hidden rounded-2xl border border-[#1e1c14] bg-[#0b0b08] hover:border-[#c9a84c]/40 transition-colors text-left group"
      aria-label={article.title}
    >
      {/* Thumbnail */}
      {article.image_url && (
        <div className="relative w-full h-32 overflow-hidden bg-[#1a1810]">
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 space-y-2">
        {/* Source badge */}
        <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
          {article.source_name}
        </span>

        {/* Title */}
        <h3 className="text-[#f0ede6] text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-[#5a5548] text-xs leading-relaxed line-clamp-2">{article.description}</p>
        )}

        {/* Metadata */}
        <p className="text-[#5a5548] text-xs font-mono pt-2 border-t border-[#1a1810]">
          {relativeTime}
        </p>
      </div>
    </button>
  );
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return "recently";
  }
}
