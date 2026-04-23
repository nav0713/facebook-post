"use client";

import { useState } from "react";
import type { NewsSource } from "@/types/news";

interface SourceListProps {
  sources: NewsSource[];
  onSourcesChange: () => void;
}

export default function SourceList({ sources, onSourcesChange }: SourceListProps) {
  const [deleting, setDeleting] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleActive = async (source: NewsSource) => {
    setTogglingId(source.id);
    try {
      const res = await fetch(`/api/news/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !source.active }),
      });

      if (res.ok) {
        onSourcesChange();
      }
    } catch (err) {
      console.error("Failed to toggle source:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sigurado ka na?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/news/sources/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onSourcesChange();
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[#f0ede6] font-semibold">Mga RSS Sources ({sources.length})</h3>

      <div className="grid gap-2 max-h-96 overflow-y-auto">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 rounded-xl border border-[#1e1c14] bg-[#0b0b08] hover:border-[#c9a84c]/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[#f0ede6] text-sm font-semibold truncate">{source.name}</p>
              <p className="text-[#5a5548] text-xs font-mono truncate">{source.url}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#c9a84c]">
                  {source.category}
                </span>
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#5a5548]">
                  {source.type}
                </span>
              </div>
            </div>

            <div className="flex gap-2 ml-2 flex-shrink-0">
              {/* Toggle active/inactive */}
              <button
                onClick={() => handleToggleActive(source)}
                disabled={togglingId === source.id}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  source.active
                    ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                    : "bg-[#2a2820] text-[#5a5548] hover:bg-[#3a3830]"
                }`}
              >
                {source.active ? "Aktibo" : "Hindi"}
              </button>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(source.id)}
                disabled={deleting === source.id}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50"
              >
                {deleting === source.id ? "Binu…" : "Tanggalin"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
