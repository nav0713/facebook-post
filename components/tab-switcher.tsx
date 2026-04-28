"use client";

interface TabSwitcherProps {
  activeTab: "extractor" | "aggregator" | "image";
  onTabChange: (tab: "extractor" | "aggregator" | "image") => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-2 mb-8 border-b border-[#1a1810]">
      <button
        onClick={() => onTabChange("extractor")}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "extractor"
            ? "border-[#c9a84c] text-[#c9a84c]"
            : "border-transparent text-[#5a5548] hover:text-[#c5c0b4]"
        }`}
      >
        Article Extractor
      </button>
      <button
        onClick={() => onTabChange("aggregator")}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "aggregator"
            ? "border-[#c9a84c] text-[#c9a84c]"
            : "border-transparent text-[#5a5548] hover:text-[#c5c0b4]"
        }`}
      >
        News Aggregator
      </button>
      <button
        onClick={() => onTabChange("image")}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "image"
            ? "border-[#c9a84c] text-[#c9a84c]"
            : "border-transparent text-[#5a5548] hover:text-[#c5c0b4]"
        }`}
      >
        Post Recreator
      </button>
    </div>
  );
}
