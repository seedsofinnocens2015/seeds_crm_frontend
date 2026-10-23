"use client";

import { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";

interface InfoTooltipProps {
  title: string;
  meaning: string;
  howToFind: string;
  sourceType?: "auto" | "manual" | "both";
  example?: string;
  className?: string;
}

export default function InfoTooltip({
  title,
  meaning,
  howToFind,
  sourceType = "both",
  example,
  className = "",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sourceBadge =
    sourceType === "auto" ? (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Automatic (from Meta)
      </span>
    ) : sourceType === "manual" ? (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Manual Entry
      </span>
    ) : (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Auto-Discovered / Manual Fallback
      </span>
    );

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="p-0.5 text-slate-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded transition-colors"
        aria-label={`Information about ${title}`}
        title={`Click or hover for help on ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bottom-full mb-2 w-72 sm:w-80 p-3.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-left text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              {title}
            </span>
            <div className="flex items-center gap-1.5">
              {sourceBadge}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white p-0.5"
                aria-label="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Meaning / What it means */}
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                What this means
              </span>
              <p className="text-slate-200 text-[11px]">{meaning}</p>
            </div>

            {/* How to find in Meta */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block">
                Where to find it in Meta
              </span>
              <p className="text-slate-300 text-[11px]">{howToFind}</p>
            </div>

            {/* Example */}
            {example && (
              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400">Example:&nbsp;</span>
                <code className="text-[11px] font-mono text-emerald-300 bg-slate-800 px-1.5 py-0.5 rounded">
                  {example}
                </code>
              </div>
            )}
          </div>

          {/* Tiny arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-3 sm:translate-x-0 -mt-1 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
        </div>
      )}
    </div>
  );
}
