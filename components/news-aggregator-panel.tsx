"use client";

import { useEffect, useState } from "react";
import NewsArticleCard from "./news-article-card";
import NewsFilterBar from "./news-filter-bar";
import SourceForm from "./source-form";
import SourceList from "./source-list";
import type { NewsArticle, NewsSource, NewsArticlesResponse } from "@/types/news";

interface NewsAggregatorPanelProps {
  onArticleSelect: (url: string) => void;
}

export default function NewsAggregatorPanel({ onArticleSelect }: NewsAggregatorPanelProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ category?: string; type?: string }>({});
  const [selectedSources, setSelectedSources] = useState<number[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [activeSection, setActiveSection] = useState<"browse" | "manage">("browse");

  // Fetch sources
  const fetchSources = async () => {
    try {
      const res = await fetch("/api/news/sources");
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Fetch articles
  const fetchArticles = async (pageNum: number = 1, shouldAppend: boolean = false) => {
    try {
      const params = new URLSearchParams();
      params.set("page", pageNum.toString());
      params.set("limit", "20");

      if (filters.category) params.set("category", filters.category);
      if (filters.type) params.set("type", filters.type);
      if (selectedSources.length > 0) {
        params.set("source_ids", selectedSources.join(","));
      }

      const res = await fetch(`/api/news/articles?${params}`);

      if (!res.ok) throw new Error("Failed to fetch articles");

      const data: NewsArticlesResponse = await res.json();

      if (data.articles.length === 0 && pageNum === 1) {
        await handleRefresh();
        return;
      }

      if (shouldAppend) {
        setArticles((prev) => [...prev, ...data.articles]);
      } else {
        setArticles(data.articles);
      }

      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      setError("Failed to load articles. Try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchArticles(1, false);
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchArticles(1, false);
  }, [filters, selectedSources]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/news/refresh", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setPage(1);
        await fetchArticles(1, false);
      }
    } catch (err) {
      console.error("Failed to refresh feed:", err);
      setError("Failed to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchArticles(nextPage, true);
  };

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveSection("browse")}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            activeSection === "browse"
              ? "bg-[#c9a84c] text-[#0a0900]"
              : "border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c]/10"
          }`}
        >
          Tingnan ang Balita
        </button>
        <button
          onClick={() => setActiveSection("manage")}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
            activeSection === "manage"
              ? "bg-[#c9a84c] text-[#0a0900]"
              : "border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c]/10"
          }`}
        >
          Pamahalaan ang Sources
        </button>
      </div>

      {/* Browse section */}
      {activeSection === "browse" && (
        <div className="space-y-6">
          {/* Header and refresh button */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">
                Impormasyon
              </span>
              <h2 className="text-2xl font-black text-[#f0ede6] mt-1">
                Pinakabagong <span className="text-[#c9a84c]">Balita</span>
              </h2>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#c9a84c] text-[#0a0900] hover:bg-[#e0be6a] disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {refreshing ? "Sinisiguro…" : "I-refresh"}
            </button>
          </div>

          {/* Filters */}
          <NewsFilterBar
            sources={sources}
            selectedSources={selectedSources}
            onCategoryChange={(category) =>
              setFilters((prev) => ({ ...prev, category: category || undefined }))
            }
            onTypeChange={(type) => setFilters((prev) => ({ ...prev, type: type as any || undefined }))}
            onSourcesChange={(sourceIds) => setSelectedSources(sourceIds)}
          />

          {/* Status message */}
          {error && (
            <div className="p-4 rounded-xl border border-red-900/50 bg-[#0f0808]">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && articles.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl border border-[#1e1c14] bg-[#0b0b08] animate-pulse"
                />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              {/* Article grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article) => (
                  <NewsArticleCard
                    key={article.id}
                    article={article}
                    onSelect={onArticleSelect}
                  />
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl text-sm font-semibold border-2 border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#0a0900] disabled:opacity-50 transition-all"
                  >
                    {loading ? "Binabasa…" : "Magkaroon ng Marami"}
                  </button>
                </div>
              )}

              {/* Total count */}
              <p className="text-[#5a5548] text-xs text-center pt-4">
                Ipinakita {articles.length} ng {total} balita
              </p>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#5a5548] text-sm">Walang balita na nahanap.</p>
            </div>
          )}
        </div>
      )}

      {/* Manage sources section */}
      {activeSection === "manage" && (
        <div className="space-y-6">
          {!showAddSource ? (
            <button
              onClick={() => setShowAddSource(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#c9a84c] text-[#0a0900] hover:bg-[#e0be6a] transition-all"
            >
              + Magdagdag ng Bagong Source
            </button>
          ) : (
            <SourceForm onSourceAdded={(source) => {
              setShowAddSource(false);
              fetchSources();
            }} onCancel={() => setShowAddSource(false)} />
          )}

          <SourceList
            sources={sources}
            onSourcesChange={fetchSources}
          />
        </div>
      )}
    </div>
  );
}
