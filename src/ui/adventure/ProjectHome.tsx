import React from "react";
import type { LegacyStageId, GenerationTelemetryView } from "./types";
import type { SavedLoreBibleProjectV2 } from "../../lib/projectPersistence";
import {
  Feather,
  Sparkles,
  PlusCircle,
  Archive,
  ArrowRight,
  Clock,
  BookOpen,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { JourneyStrip } from "./JourneyStrip";

interface ProjectHomeProps {
  workingTitle?: string;
  sparkText?: string;
  currentStage: LegacyStageId;
  maxUnlockedStage: LegacyStageId;
  savedProjects: SavedLoreBibleProjectV2[];
  generationTelemetry: GenerationTelemetryView;
  onContinueWriting: () => void;
  onSelectStage: (stage: LegacyStageId) => void;
  onNewScenario: () => void;
  onOpenVault: () => void;
  onLoadSavedProject?: (project: SavedLoreBibleProjectV2) => void;
  className?: string;
}

export const ProjectHome: React.FC<ProjectHomeProps> = ({
  workingTitle,
  sparkText,
  currentStage,
  maxUnlockedStage,
  savedProjects,
  generationTelemetry,
  onContinueWriting,
  onSelectStage,
  onNewScenario,
  onOpenVault,
  onLoadSavedProject,
  className = "",
}) => {
  const displayTitle = workingTitle && workingTitle.trim().length > 0 ? workingTitle : "Untitled Scenario";
  const stageLabels = ["Spark", "Divergence", "Blueprint", "Forge", "Refine"];
  const currentStageName = stageLabels[currentStage - 1] || "Spark";

  return (
    <div
      id="adventure-project-home"
      className={`max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none font-apparatus ${className}`}
    >
      {/* 1. Project Hero Card (Warm Parchment Card inspired by mockup) */}
      <section
        aria-label="Active Project"
        className="parchment-sheet rounded-[4px] p-5 sm:p-7 relative overflow-hidden border border-[var(--border-paper)]"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono-ui uppercase tracking-wider text-[var(--text-paper-muted)]">
              <span className="text-[var(--accent-gold)] font-bold">Active Manuscript</span>
              <span>·</span>
              <span>Stage {currentStage}: {currentStageName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif-title text-[var(--text-paper)] leading-tight">
              {displayTitle}
            </h1>

            {sparkText && sparkText.trim().length > 0 ? (
              <p className="text-xs sm:text-sm text-[var(--text-paper-muted)] line-clamp-2 leading-relaxed italic">
                “{sparkText}”
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--text-paper-muted)] italic">
                A fresh creative seed waiting to be shaped.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onContinueWriting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[3px] bg-[var(--surface-app)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-gold)] font-semibold text-xs tracking-wide shadow-md transition-all cursor-pointer min-h-[44px]"
            >
              <Feather size={14} className="text-[var(--accent-gold)]" />
              <span>Continue Writing</span>
              <ArrowRight size={14} className="text-[var(--accent-gold)] opacity-80" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Active Generation Alert (Truthful, compact) */}
      {generationTelemetry.isGenerating && (
        <section
          aria-label="Active Generation"
          className="p-4 rounded-[4px] bg-[var(--surface-panel)] border border-[var(--border-gold)] shadow-[0_0_12px_rgba(212,175,55,0.15)] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[var(--accent-gold)] shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-[var(--accent-gold)] flex items-center gap-2">
                <span>{generationTelemetry.taskLabel}</span>
                {generationTelemetry.specialistPhase && (
                  <span className="text-[10px] font-mono-ui bg-[var(--surface-panel-raised)] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[var(--text-primary)]">
                    {generationTelemetry.specialistPhase}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {generationTelemetry.phaseLabel}
              </div>
            </div>
          </div>

          {generationTelemetry.canCancel && generationTelemetry.onCancel && (
            <button
              type="button"
              onClick={generationTelemetry.onCancel}
              className="px-3 py-1.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--status-danger)]/50 text-[var(--status-danger)] hover:bg-[var(--status-danger)] hover:text-white text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
            >
              Stop
            </button>
          )}
        </section>
      )}

      {/* 3. Your Journey Overview */}
      <section aria-label="Workflow Journey" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            <Sparkles size={13} className="text-[var(--accent-gold)]" />
            <span>Creative Journey</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono-ui">
            Stage {currentStage} of 5
          </div>
        </div>

        <div className="rounded-[4px] overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-panel)]">
          <JourneyStrip
            currentStage={currentStage}
            maxUnlockedStage={maxUnlockedStage}
            onSelectStage={onSelectStage}
          />
        </div>
      </section>

      {/* 4. Quick Actions & Recent Manuscripts Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Quick Actions Panel */}
        <section
          aria-label="Quick Actions"
          className="md:col-span-1 rounded-[4px] p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-soft)] pb-2">
            <PlusCircle size={13} className="text-[var(--accent-gold)]" />
            <span>Quick Actions</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onNewScenario}
              className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--border-strong)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle size={15} className="text-[var(--rubric)] shrink-0" />
                <div>
                  <div className="font-semibold leading-tight">New Scenario</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Start with fresh seed</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenVault}
              className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--border-strong)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Archive size={15} className="text-[var(--accent-gold)] shrink-0" />
                <div>
                  <div className="font-semibold leading-tight">Open Library Vault</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {savedProjects.length} saved {savedProjects.length === 1 ? "project" : "projects"}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Recent Manuscripts (Real Data Only from savedProjects) */}
        <section
          aria-label="Recent Manuscripts"
          className="md:col-span-2 rounded-[4px] p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              <BookOpen size={13} className="text-[var(--accent-gold)]" />
              <span>Recent Projects / Saved Manuscripts</span>
            </div>
            {savedProjects.length > 0 && (
              <button
                type="button"
                onClick={onOpenVault}
                className="text-[11px] text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                View all ({savedProjects.length})
              </button>
            )}
          </div>

          {savedProjects.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] space-y-1">
              <div className="font-manuscript italic">No saved manuscripts yet in the vault.</div>
              <div className="text-[11px]">Save your current scenario to preserve it in your library.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {savedProjects.slice(0, 3).map((proj) => {
                const updatedDate = proj.savedAt || proj.document.updatedAt ? new Date(proj.savedAt || proj.document.updatedAt).toLocaleDateString() : "Recently";

                return (
                  <div
                    key={proj.document.id}
                    className="flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs text-[var(--text-primary)]"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold truncate">{proj.document.title || "Untitled Scenario"}</div>
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} />
                        <span>{updatedDate}</span>
                      </div>
                    </div>

                    {onLoadSavedProject && (
                      <button
                        type="button"
                        onClick={() => onLoadSavedProject(proj)}
                        className="px-2.5 py-1 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] text-[11px] font-semibold transition-colors shrink-0 cursor-pointer min-h-[32px]"
                      >
                        Load
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
