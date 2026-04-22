"use client";

import { useState, FormEvent } from "react";
import { isValidUrl } from "@/lib/utils";

interface UrlFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError("Please paste an article URL.");
      return;
    }

    if (!isValidUrl(trimmed)) {
      setValidationError("That doesn't look like a valid URL. Include http:// or https://");
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex flex-col gap-3">
        <div className="relative">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="https://www.rappler.com/article/..."
            disabled={isLoading}
            className={`
              w-full px-5 py-4 pr-[140px] rounded-2xl border-2 text-base
              bg-[#0f0f0f] text-[#f0ede6] placeholder-[#4a4740]
              font-mono tracking-tight outline-none transition-all duration-200
              ${validationError
                ? "border-red-500/70 focus:border-red-400"
                : "border-[#2a2820] focus:border-[#c9a84c]"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide
              transition-all duration-200
              ${isLoading || !url.trim()
                ? "bg-[#2a2820] text-[#5a5548] cursor-not-allowed"
                : "bg-[#c9a84c] text-[#0a0900] hover:bg-[#e0be6a] active:scale-95 cursor-pointer"
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <LoadingDots />
                <span>Reading…</span>
              </span>
            ) : (
              "Extract →"
            )}
          </button>
        </div>

        {validationError && (
          <p className="text-red-400 text-sm pl-1">{validationError}</p>
        )}

        <p className="text-[#4a4740] text-xs pl-1">
          Paste any news or article URL — works with Rappler, Inquirer, ABS-CBN, BBC, and more.
        </p>
      </div>
    </form>
  );
}

function LoadingDots() {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
