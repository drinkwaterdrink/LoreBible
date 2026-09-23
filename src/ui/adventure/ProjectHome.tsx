import React from "react";
import type { LegacyStageId, GenerationTelemetryView } from "./types";
import type { SavedLoreBibleProjectV2 } from "../../lib/projectPersistence";
import {
  Feather,
  Sparkles,
  Split,
  Compass,
  Hammer,
  BookOpen,
  PlusCircle,
  Archive,
  ArrowRight,
  Clock,
  Command,
  Settings,
  Loader2,
} from "lucide-react";
import { JourneyStrip } from "./JourneyStrip";
import { motion } from "motion/react";
import { APP_VERSION } from "../../version";


export interface ProjectHomeProps {
  workingTitle?: string;
  sparkText?: string;
  currentStage: LegacyStageId;
  maxUnlockedStage: LegacyStageId;
  savedProjects: SavedLoreBibleProjectV2[];
  generationTelemetry: GenerationTelemetryView;
  isSaved?: boolean;
  onContinueWriting: () => void;
  onSelectStage: (stage: LegacyStageId) => void;
  onNewScenario: () => void;
  onOpenVault: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onLoadSavedProject?: (project: SavedLoreBibleProjectV2) => void;
  className?: string;
}

export const PRIMARY_STAGE_ACTIONS: Record<
  LegacyStageId,
  { label: string; stageName: string; subtitle: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  1: { label: "Continue Spark", stageName: "Spark", subtitle: "Premise & Register", icon: Sparkles },
  2: { label: "Review Divergence", stageName: "Divergence", subtitle: "Four Angles", icon: Split },
  3: { label: "Open Blueprint", stageName: "Blueprint", subtitle: "Rules & Physics", icon: Compass },
  4: { label: "Continue Forge", stageName: "Forge", subtitle: "Streaming Synthesis", icon: Hammer },
  5: { label: "Review Manuscript", stageName: "Refine", subtitle: "Manuscript & Codex", icon: BookOpen },
};

export const ProjectHome: React.FC<ProjectHomeProps> = ({
  workingTitle,
  sparkText,
  currentStage,
  maxUnlockedStage,
  savedProjects,
  generationTelemetry,
  isSaved = true,
  onContinueWriting,
  onSelectStage,
  onNewScenario,
  onOpenVault,
  onOpenCommandPalette,
  onOpenSettings,
  onLoadSavedProject,
  className = "",
}) => {
  const displayTitle = workingTitle && workingTitle.trim().length > 0 ? workingTitle : "Untitled Scenario";
  const stageAction = PRIMARY_STAGE_ACTIONS[currentStage] || PRIMARY_STAGE_ACTIONS[1];
  const ContinueIcon = stageAction.icon;

  return (
    <div
      id="adventure-project-home"
      className={`max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none font-apparatus ${className}`}
    >
      {/* 1. PROJECT HERO / CURRENT PROJECT (Warm Parchment Card inspired by mockup) */}
      <motion.section
        aria-label="Active Project"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="parchment-sheet rounded-[4px] p-5 sm:p-7 relative overflow-hidden border border-[var(--border-paper)] shadow-md"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono-ui uppercase tracking-wider text-[var(--text-paper-muted)]">
              <span className="text-[var(--accent-gold)] font-bold">Active Manuscript</span>
              <span>·</span>
              <span>Stage {currentStage}: {stageAction.stageName}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSaved ? "bg-[var(--status-success)]" : "bg-[var(--status-warning)]"
                  }`}
                />
                <span className={isSaved ? "text-[var(--status-success)]" : "text-[var(--status-warning)]"}>
                  {isSaved ? "Saved" : "Unsaved"}
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif-title text-[var(--text-paper)] leading-tight">
              {displayTitle}
            </h1>

            {sparkText && sparkText.trim().length > 0 ? (
              <p className="text-xs sm:text-sm text-[var(--text-paper-muted)] line-clamp-2 leading-relaxed italic font-manuscript">
                “{sparkText}”
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--text-paper-muted)] italic font-manuscript">
                A fresh creative seed waiting to be shaped in the scriptorium.
              </p>
            )}
          </div>

          {/* Single Dominant Primary Continue CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="hero-primary-continue-btn"
              onClick={onContinueWriting}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-[3px] bg-[var(--surface-sidebar)] text-[var(--accent-gold)] border border-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-[var(--surface-sidebar)] font-bold text-xs tracking-wider uppercase shadow-lg transition-all cursor-pointer min-h-[44px]"
            >
              <ContinueIcon size={16} />
              <span>{stageAction.label}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* 2. ACTIVE GENERATION ALERT (Truthful telemetry, compact) */}
      {generationTelemetry.isGenerating && (
        <section
          aria-label="Active Generation"
          className="p-4 rounded-[4px] bg-[var(--surface-panel)] border border-[var(--accent-gold)] shadow-[0_0_12px_rgba(212,175,55,0.18)] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Loader2 size={18} className="animate-spin text-[var(--accent-gold)] shrink-0" />
            <div className="text-xs min-w-0">
              <div className="font-semibold text-[var(--accent-gold)] flex items-center gap-2 truncate">
                <span>{generationTelemetry.taskLabel}</span>
                {generationTelemetry.specialistPhase && (
                  <span className="text-[10px] font-mono-ui bg-[var(--surface-panel-raised)] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[var(--text-primary)] shrink-0">
                    {generationTelemetry.specialistPhase}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                {generationTelemetry.phaseLabel}
                {typeof generationTelemetry.outputTokens === "number" && (
                  <span className="ml-2 font-mono-ui text-[10px] opacity-75">
                    · {generationTelemetry.outputTokens.toLocaleString()} tokens
                  </span>
                )}
              </div>
            </div>
          </div>

          {generationTelemetry.canCancel && generationTelemetry.onCancel && (
            <button
              type="button"
              onClick={generationTelemetry.onCancel}
              className="px-3 py-1.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--status-danger)]/50 text-[var(--status-danger)] hover:bg-[var(--status-danger)] hover:text-white text-xs font-semibold transition-colors cursor-pointer min-h-[36px] shrink-0"
            >
              Stop
            </button>
          )}
        </section>
      )}

      {/* 3. YOUR JOURNEY (Existing JourneyStrip with Stage 3 Blueprint: Rules & Physics) */}
      <section aria-label="Workflow Journey" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            <Sparkles size={13} className="text-[var(--accent-gold)]" />
            <span>Your Journey</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono-ui">
            Stage {currentStage} of 5 · {stageAction.stageName}
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

      {/* 4. QUICK ACTIONS & SAVED MANUSCRIPTS BENTO REGION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Quick Actions Panel */}
        <section
          aria-label="Quick Actions"
          className="md:col-span-1 rounded-[4px] p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-soft)] pb-2 mb-3">
              <PlusCircle size={13} className="text-[var(--accent-gold)]" />
              <span>Quick Actions</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onNewScenario}
                className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle size={15} className="text-[var(--accent-gold)] shrink-0" />
                  <div>
                    <div className="font-semibold leading-tight">New Scenario</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Start with fresh seed</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenVault}
                className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Archive size={15} className="text-[var(--accent-gold)] shrink-0" />
                  <div>
                    <div className="font-semibold leading-tight">Open Library Vault</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {savedProjects.length} saved {savedProjects.length === 1 ? "manuscript" : "manuscripts"}
                    </div>
                  </div>
                </div>
              </button>

              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Command size={15} className="text-[var(--accent-gold)] shrink-0" />
                    <div>
                      <div className="font-semibold leading-tight">Commands &amp; Search</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Keyboard shortcuts (⌘K)</div>
                    </div>
                  </div>
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-between p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] text-xs text-left transition-all min-h-[44px] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings size={15} className="text-[var(--accent-gold)] shrink-0" />
                    <div>
                      <div className="font-semibold leading-tight">Connections &amp; Settings</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Provider &amp; model config</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 5. SAVED / RECENT WORK (Real Data Only from savedProjects) */}
        <section
          aria-label="Recent Manuscripts"
          className="md:col-span-2 rounded-[4px] p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2 mb-3">
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
                <div className="font-manuscript italic">No saved manuscripts yet in the library vault.</div>
                <div className="text-[11px]">Save your current scenario to preserve it in your library.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {savedProjects.slice(0, 4).map((proj) => {
                  const updatedDate = proj.savedAt || proj.document.updatedAt ? new Date(proj.savedAt || proj.document.updatedAt).toLocaleDateString() : "Recently";

                  return (
                    <div
                      key={proj.document.id}
                      className="flex flex-col justify-between p-3 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="min-w-0 mb-2">
                        <div className="font-semibold truncate leading-tight" title={proj.document.title}>
                          {proj.document.title || "Untitled Scenario"}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                          <Clock size={10} />
                          <span>{updatedDate}</span>
                          {proj.workflow?.stage && (
                            <>
                              <span>·</span>
                              <span className="font-mono-ui uppercase">{proj.workflow.stage}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {onLoadSavedProject && (
                        <div className="pt-2 border-t border-[var(--border-soft)]/50 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onLoadSavedProject(proj)}
                            className="px-3 py-1 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] text-[11px] font-semibold transition-colors cursor-pointer min-h-[32px]"
                          >
                            Load Manuscript
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Brand & Version Footer */}
        <footer className="pt-4 border-t border-[var(--border-soft)] flex items-center justify-between text-[11px] font-mono-ui text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-gold)]">§</span>
            <span>LoreBible Adventure Journal</span>
          </span>
          <span
            className="px-2 py-0.5 rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--accent-gold)] font-medium"
            aria-label={`LoreBible version ${APP_VERSION}`}
          >
            v{APP_VERSION}
          </span>
        </footer>
      </div>
    </div>
  );
};
