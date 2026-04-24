"use client";

import { useState, FormEvent } from "react";
import type { NewsSource } from "@/types/news";

interface SourceFormProps {
  onSourceAdded: (source: NewsSource) => void;
  onCancel: () => void;
}

export default function SourceForm({ onSourceAdded, onCancel }: SourceFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [type, setType] = useState("local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/news/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, category, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add source");
      }

      const source = await res.json();
      onSourceAdded(source);
      setName("");
      setUrl("");
      setCategory("general");
      setType("local");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#1e1c14] bg-[#0b0b08] p-6 space-y-4">
      <h3 className="text-[#f0ede6] font-semibold">Magdagdag ng Bagong Source</h3>

      <div>
        <label className="block text-[#c5c0b4] text-sm mb-2">Pangalan</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Rappler"
          required
          className="w-full px-4 py-2 rounded-xl border border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] placeholder-[#4a4740] focus:border-[#c9a84c] outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-[#c5c0b4] text-sm mb-2">RSS Feed URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed"
          required
          className="w-full px-4 py-2 rounded-xl border border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] placeholder-[#4a4740] focus:border-[#c9a84c] outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[#c5c0b4] text-sm mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] focus:border-[#c9a84c] outline-none transition-colors"
          >
            <option value="general">General</option>
            <option value="politics">Politics</option>
            <option value="crime">Crime</option>
            <option value="sports">Sports</option>
            <option value="tech">Tech</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div>
          <label className="block text-[#c5c0b4] text-sm mb-2">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-[#2a2820] bg-[#0f0f0f] text-[#f0ede6] focus:border-[#c9a84c] outline-none transition-colors"
          >
            <option value="local">Local</option>
            <option value="international">International</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl bg-[#c9a84c] text-[#0a0900] font-semibold hover:bg-[#e0be6a] disabled:opacity-50 transition-all"
        >
          {loading ? "Idinaragdag…" : "Magdagdag"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] font-semibold hover:bg-[#c9a84c]/10 transition-colors"
        >
          Bawiin
        </button>
      </div>
    </form>
  );
}
