import React, { useState } from "react";
import type { BuildLogItem, LoreBibleDocument } from "../../../types";
import type { GenerationActivityProps } from "../../../components/GenerationActivity";
import {
  deriveAdventureForgeView,
  type BundleStatus,
} from "./forgeViewModel";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Feather,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Compass,
  Layers,
  StopCircle,
  RotateCcw,
} from "lucide-react";

export interface AdventureForgeWorkspaceProps {
  buildLogs: BuildLogItem[];
  streamedSections: Record<string, any>;
  isForging: boolean;
  document: LoreBibleDocument | null;
  onProceedToRefine: () => void;
  workingTitle: string;
  forgeError?: string | null;
  onRetryForge?: () => void;
  generationActivity?: GenerationActivityProps;
  hasCheckpoint?: boolean;
  onContinueForge?: () => void;
  boundedSpecialists?: boolean;
  activeSpecialistPhase?: string;
  specialistProgress?: {
    currentJob: number;
    totalJobs: number;
    phaseName: string;
    isPreserved?: boolean;
  };
}

export const AdventureForgeWorkspace: React.FC<AdventureForgeWorkspaceProps> = (props) => {
  const {
    onProceedToRefine,
    onRetryForge,
    onContinueForge,
    generationActivity,
  } = props;

  const [showLogs, setShowLogs] = useState(false);

  const viewModel = deriveAdventureForgeView({
    isForging: props.isForging,
    workingTitle: props.workingTitle,
    forgeError: props.forgeError,
    hasCheckpoint: props.hasCheckpoint,
    buildLogs: props.buildLogs,
    streamedSections: props.streamedSections,
    document: props.document,
    generationActivity: props.generationActivity,
    boundedSpecialists: props.boundedSpecialists,
    activeSpecialistPhase: props.activeSpecialistPhase,
    specialistProgress: props.specialistProgress,
  });

  const getStatusBadge = (status: BundleStatus) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-ui font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 size={10} className="text-emerald-400" />
            FORGED
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-ui font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse">
            <Sparkles size={10} className="text-amber-400" />
            INKING
          </span>
        );
      case "interrupted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-ui font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60">
            <AlertTriangle size={10} className="text-rose-400" />
            INTERRUPTED
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-ui text-[var(--graphite)] bg-[var(--vellum-subtle)] border border-[var(--ink-soft)]">
            <Clock size={10} />
            QUEUED
          </span>
        );
    }
  };

  return (
    <div
      id="adventure-forge-workspace"
      className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-32 text-[var(--ink)]"
    >
      {/* 1. Command Center Header */}
      <header className="border-b border-[var(--ink-soft)] pb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-ui uppercase tracking-widest text-[var(--gold)] font-bold px-2 py-0.5 rounded bg-[var(--vellum-raised)] border border-[var(--ink-soft)]">
              Stage 04 · Forge Command Center
            </span>
            {viewModel.isForging && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono-ui text-amber-300 bg-amber-950/70 rounded border border-amber-800/80 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                PIPELINE ACTIVE
              </span>
            )}
            {viewModel.isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono-ui text-emerald-300 bg-emerald-950/70 rounded border border-emerald-800/80">
                <ShieldCheck size={12} className="text-emerald-400" />
                WORLD FORGED
              </span>
            )}
          </div>

          {/* Telemetry pills */}
          <div className="flex items-center gap-2 text-[11px] font-mono-ui text-[var(--graphite)]">
            <span className="px-2 py-0.5 bg-[var(--vellum-raised)] rounded border border-[var(--ink-soft)]">
              {viewModel.completedBundleCount} / {viewModel.totalBundleCount} Bundles
            </span>
            {viewModel.totalEntriesCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--vellum-raised)] rounded border border-[var(--ink-soft)]">
                {viewModel.totalEntriesCount} Entries
              </span>
            )}
            {viewModel.wordCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--vellum-raised)] rounded border border-[var(--ink-soft)]">
                ~{viewModel.wordCount} Words
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-manuscript font-semibold tracking-tight text-[var(--ink)]">
          {viewModel.workingTitle}
        </h1>
        <p className="text-xs font-manuscript text-[var(--graphite)]">
          Autonomous multi-specialist fabrication pipeline. Every completed bundle is checkpointed and preserved.
        </p>
      </header>

      {/* 2. Error Banner (if interrupted) */}
      {viewModel.hasError && (
        <section
          role="alert"
          aria-label="Forge Interruption"
          className="p-4 rounded-[4px] bg-rose-950/40 border border-rose-800/70 space-y-2 text-rose-200"
        >
          <div className="flex items-center gap-2 font-apparatus text-xs font-semibold uppercase tracking-wider text-rose-300">
            <AlertTriangle size={14} className="text-rose-400" />
            <span>Forge Interruption Recorded</span>
          </div>
          <p className="text-xs font-manuscript text-rose-100">
            {viewModel.errorMessage || "The provider stream was interrupted. Completed bundles have been safely preserved."}
          </p>
          <div className="pt-2 flex items-center gap-3">
            {onRetryForge && (
              <button
                type="button"
                onClick={onRetryForge}
                className="px-3 py-1.5 text-xs font-mono-ui font-semibold bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded border border-rose-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Resume from last preserved bundle</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. Completed Celebration Card */}
      {viewModel.isCompleted && (
        <section className="p-6 rounded-[4px] bg-gradient-to-b from-amber-950/30 to-[var(--vellum-raised)] border border-[var(--gold)]/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-900/50 border border-[var(--gold)] flex items-center justify-center text-[var(--gold)]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono-ui uppercase tracking-widest text-[var(--gold)] font-bold">
                Manuscript Ready
              </span>
              <h2 className="text-xl font-manuscript font-semibold text-[var(--ink)]">
                World Forged Successfully
              </h2>
            </div>
          </div>
          <p className="text-xs font-manuscript text-[var(--graphite)] leading-relaxed">
            All six canonical specialist bundles have been compiled and validated into the master manuscript. You can now step into the Refine Studio to review entries, inspect relationships, and tune specific lore attributes.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onProceedToRefine}
              className="btn-primary min-h-[44px] px-6 py-2.5 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Feather size={14} />
              <span>Enter Refine Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}

      {/* 4. Active Specialist Live Card (during generation or checkpoint) */}
      {viewModel.activeSpecialist && !viewModel.isCompleted && (
        <section className="p-4 rounded-[4px] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] space-y-3 relative overflow-hidden">
          {viewModel.activeSpecialist.pulseActive && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent animate-pulse" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass
                size={16}
                className={
                  viewModel.activeSpecialist.pulseActive
                    ? "text-[var(--gold)] animate-spin"
                    : "text-[var(--graphite)]"
                }
              />
              <span className="text-[11px] font-apparatus font-bold uppercase tracking-wider text-[var(--ink)]">
                Active Specialist: {viewModel.activeSpecialist.title}
              </span>
            </div>

            <span className="text-[10px] font-mono-ui px-2 py-0.5 rounded bg-[var(--vellum)] border border-[var(--ink-soft)] text-[var(--graphite)]">
              {viewModel.activeSpecialist.jobProgress}
            </span>
          </div>

          <p className="text-xs font-manuscript text-[var(--ink)] italic leading-relaxed">
            “{viewModel.activeSpecialist.currentActivityText}”
          </p>

          <p className="text-[11px] font-manuscript text-[var(--graphite)]">
            Mandate: {viewModel.activeSpecialist.role}
          </p>
        </section>
      )}

      {/* 5. The 6 Canonical Bundles Pipeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--graphite)] flex items-center gap-1.5">
            <Layers size={13} />
            <span>Fabrication Pipeline (6 Checkpointed Bundles)</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowLogs((prev) => !prev)}
            className="text-[11px] font-mono-ui text-[var(--graphite)] hover:text-[var(--ink)] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Terminal size={12} />
            <span>{showLogs ? "Hide Terminal Logs" : "Show Terminal Logs"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {viewModel.bundles.map((bundle) => {
            const isCompleted = bundle.status === "completed";
            const isInProgress = bundle.status === "in_progress";
            const isInterrupted = bundle.status === "interrupted";

            return (
              <div
                key={bundle.index}
                className={`p-4 rounded-[4px] border transition-all space-y-2.5 ${
                  isInProgress
                    ? "bg-amber-950/20 border-amber-700/60 shadow-sm"
                    : isCompleted
                    ? "bg-[var(--vellum-raised)] border-[var(--ink-soft)]"
                    : isInterrupted
                    ? "bg-rose-950/20 border-rose-800/60"
                    : "bg-[var(--vellum)]/50 border-[var(--ink-soft)]/50 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-ui font-bold text-[var(--gold)]">
                      0{bundle.index}
                    </span>
                    <h3 className="text-sm font-manuscript font-semibold text-[var(--ink)]">
                      {bundle.title}
                    </h3>
                  </div>
                  {getStatusBadge(bundle.status)}
                </div>

                <p className="text-[11px] font-manuscript text-[var(--graphite)] leading-snug">
                  {bundle.subtitle}
                </p>

                <div className="pt-1 text-[10px] font-mono-ui text-[var(--graphite)] flex flex-wrap items-center gap-1.5 border-t border-[var(--ink-soft)]/40">
                  <span className="text-[var(--ink)] font-semibold">Specialist:</span>
                  <span>{bundle.specialistTitle}</span>
                  {bundle.entryCount > 0 && (
                    <span className="ml-auto font-bold text-[var(--gold)]">
                      {bundle.entryCount} entries
                    </span>
                  )}
                </div>

                {bundle.previewSummary && (
                  <div className="text-[11px] font-manuscript italic text-[var(--ink)]/90 bg-[var(--vellum)] p-2 rounded border border-[var(--ink-soft)]/40">
                    {bundle.previewSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Expandable Terminal Build Logs Drawer */}
      {showLogs && (
        <section className="p-4 rounded-[4px] bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono-ui text-[11px] space-y-2 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-neutral-400">
            <span className="flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider">
              <Terminal size={12} />
              Raw Forge Diagnostics
            </span>
            <span>{viewModel.latestLogs.length} events</span>
          </div>
          {viewModel.latestLogs.length === 0 ? (
            <p className="text-neutral-500 italic py-2">No terminal build logs recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {viewModel.latestLogs.map((log, idx) => (
                <div key={log.id || idx} className="flex items-start gap-2">
                  <span className="text-neutral-500 shrink-0">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : `[#${idx + 1}]`}
                  </span>
                  <span
                    className={
                      log.status === "active"
                        ? "text-amber-400"
                        : log.status === "done"
                        ? "text-emerald-400"
                        : "text-neutral-300"
                    }
                  >
                    {log.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 7. Action Bar / Sticky Dock */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--vellum-raised)] border-t border-[var(--ink-soft)] z-30 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-manuscript text-[var(--graphite)] text-center sm:text-left">
            {viewModel.isForging ? (
              <span>
                Generation in flight. <strong className="text-[var(--ink)]">Do not refresh</strong>.
              </span>
            ) : viewModel.isCompleted ? (
              <span>All bundles forged and preserved in memory.</span>
            ) : viewModel.hasCheckpoint ? (
              <span>
                Preserved through bundle {viewModel.completedBundleCount}. Ready to resume.
              </span>
            ) : (
              <span>Ready to ink manuscript bundles.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {/* Cancel / Stop generation button */}
            {viewModel.isForging && generationActivity?.onCancel && (
              <div className="flex flex-col items-center sm:items-end">
                <button
                  type="button"
                  onClick={generationActivity.onCancel}
                  className="px-4 py-2 text-xs font-apparatus font-semibold uppercase tracking-wider text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900/80 rounded border border-rose-800/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Completed specialist jobs are already saved. The active request may need to be retried."
                >
                  <StopCircle size={13} />
                  <span>{viewModel.cancellationNotice.label}</span>
                </button>
                <span className="text-[10px] text-[var(--graphite)] font-manuscript mt-0.5 hidden sm:block">
                  Saved jobs remain preserved.
                </span>
              </div>
            )}

            {/* Checkpoint Resume Button */}
            {!viewModel.isForging && viewModel.hasCheckpoint && !viewModel.hasError && onContinueForge && (
              <button
                type="button"
                onClick={onContinueForge}
                className="btn-primary min-h-[44px] px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Feather size={12} />
                <span>Continue with next bundle</span>
              </button>
            )}

            {/* Proceed to Refine button */}
            {viewModel.canProceedToRefine && (
              <button
                id="forge-proceed-refine-btn"
                type="button"
                onClick={onProceedToRefine}
                className="btn-primary min-h-[44px] px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Feather size={12} />
                <span>Review Manuscript in Refine</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
