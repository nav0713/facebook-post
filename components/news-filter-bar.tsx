"use client";

import { useState } from "react";
import type { NewsSource } from "@/types/news";

interface NewsFilterBarProps {
  sources: NewsSource[];
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  onSourcesChange: (sourceIds: number[]) => void;
  selectedSources: number[];
}

const CATEGORIES = ["general", "politics", "crime", "sports", "tech", "business"];

export default function NewsFilterBar({
  sources,
  onCategoryChange,
  onTypeChange,
  onSourcesChange,
  selectedSources,
}: NewsFilterBarProps) {
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const handleSourceToggle = (sourceId: number) => {
    setShowSourcePicker(false);
    const newSelected = selectedSources.includes(sourceId)
      ? selectedSources.filter((id) => id !== sourceId)
      : [...selectedSources, sourceId];
    onSourcesChange(newSelected);
  };

  const handleClearSources = () => {
    onSourcesChange([]);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Category and Type filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category filter */}
        <select
          onChange={(e) => onCategoryChange(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] text-sm font-mono
            focus:border-[#c9a84c] focus:outline-none transition-colors"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          onChange={(e) => onTypeChange(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] text-sm font-mono
            focus:border-[#c9a84c] focus:outline-none transition-colors"
        >
          <option value="">All Sources</option>
          <option value="local">Local (Philippines)</option>
          <option value="international">International</option>
        </select>
      </div>

      {/* Source picker */}
      <div className="relative">
        <button
          onClick={() => setShowSourcePicker(!showSourcePicker)}
          className="w-full px-4 py-2.5 rounded-xl border-2 border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] text-sm text-left font-mono
            hover:border-[#c9a84c] focus:border-[#c9a84c] focus:outline-none transition-colors"
        >
          {selectedSources.length > 0
            ? `${selectedSources.length} source${selectedSources.length !== 1 ? "s" : ""} selected`
            : "Select specific sources..."}
        </button>

        {/* Dropdown with source checkboxes */}
        {showSourcePicker && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl border border-[#c9a84c] bg-[#0b0b08] z-10 shadow-lg max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {sources.map((source) => (
                <label key={source.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#1a1810] p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source.id)}
                    onChange={() => handleSourceToggle(source.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-[#c9a84c]"
                  />
                  <span className="text-[#f0ede6] text-sm flex-1 truncate">{source.name}</span>
                  <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#5a5548] flex-shrink-0">
                    {source.type === "local" ? "PH" : "INT"}
                  </span>
                </label>
              ))}
            </div>

            {selectedSources.length > 0 && (
              <button
                onClick={handleClearSources}
                className="w-full mt-3 pt-3 border-t border-[#1e1c14] text-[#c9a84c] text-xs font-semibold hover:text-[#e0be6a] transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected sources pills */}
      {selectedSources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSources.map((sourceId) => {
            const source = sources.find((s) => s.id === sourceId);
            return (
              <div
                key={sourceId}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e1c14] border border-[#c9a84c] text-[#c9a84c] text-xs font-semibold"
              >
                <span className="truncate">{source?.name}</span>
                <button
                  onClick={() => handleSourceToggle(sourceId)}
                  className="hover:text-[#e0be6a] transition-colors"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
