import React from "react";

interface RuledLinesSkeletonProps {
  lines?: number;
  className?: string;
  caption?: string;
}

export const RuledLinesSkeleton: React.FC<RuledLinesSkeletonProps> = ({
  lines = 4,
  className = "",
  caption = "Awaiting wet ink...",
}) => {
  return (
    <div
      className={`w-full py-3 space-y-3.5 select-none animate-pulse ${className}`}
      aria-label="Content is generating"
    >
      {caption && (
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--rubric)] animate-ping" />
          <span className="font-hand text-xs text-[var(--ink-blue)]">
            {caption}
          </span>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => {
        // Vary line length naturally
        const widths = ["w-full", "w-11/12", "w-5/6", "w-4/6", "w-3/4"];
        const widthClass = widths[i % widths.length];
        return (
          <div key={i} className="space-y-1">
            <div
              className={`h-2.5 bg-[var(--ink-soft)]/25 rounded-[1px] ${widthClass}`}
            />
            <div className="h-[1px] bg-[var(--ink-soft)]/40 w-full" />
          </div>
        );
      })}
    </div>
  );
};
