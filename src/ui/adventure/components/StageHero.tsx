import React from "react";
import { CompassRose, PixelStars } from "./DecorativeArt";

interface StageHeroProps {
  stageNumber: number;
  stageName: string;
  stageSubtitle: string;
  title: string;
  description: string;
  workingTitle?: string;
  isSaved?: boolean;
}

export const StageHero: React.FC<StageHeroProps> = ({
  stageNumber,
  stageName,
  stageSubtitle,
  title,
  description,
  workingTitle,
  isSaved = false,
}) => {
  return (
    <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-soft)] pb-5">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--border-gold)] text-[10px] font-mono tracking-widest text-[var(--accent-gold)] uppercase font-semibold">
            <CompassRose size={12} />
            Stage 0{stageNumber} · {stageSubtitle}
          </span>
          <PixelStars className="hidden sm:inline-block text-[var(--accent-gold)] opacity-50" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif-title font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </h1>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-manuscript max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {workingTitle && (
        <div className="shrink-0 flex items-center gap-2 self-start md:self-end px-2.5 py-1 rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] text-xs">
          <span className="text-[var(--text-muted)] font-mono text-[10px] uppercase">Manuscript:</span>
          <span className="font-serif-title font-medium text-[var(--text-primary)] truncate max-w-[200px]">
            {workingTitle}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSaved ? "bg-[var(--accent-sage)]" : "bg-[var(--accent-gold)] animate-pulse"
            }`}
            title={isSaved ? "Saved" : "Unsaved changes"}
          />
        </div>
      )}
    </header>
  );
};
