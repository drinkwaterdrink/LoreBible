import React, { useEffect, useRef } from "react";
import { BuildLogItem, LoreBibleDocument } from "../types";
import { CheckCircle2, Feather, ArrowRight, AlertTriangle } from "lucide-react";
import { RuledLinesSkeleton } from "./RuledLinesSkeleton";
import { GenerationActivity, type GenerationActivityProps } from "./GenerationActivity";

import { specialistPhaseLabel } from "./GenerationActivity";

interface ForgeStageProps {
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

export const ForgeStage: React.FC<ForgeStageProps> = ({
  buildLogs,
  streamedSections,
  isForging,
  document,
  onProceedToRefine,
  workingTitle,
  forgeError,
  onRetryForge,
  generationActivity,
  hasCheckpoint = false,
  onContinueForge,
  boundedSpecialists = false,
  activeSpecialistPhase,
  specialistProgress,
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [buildLogs]);

  const specialistInfo = React.useMemo(() => {
    if (specialistProgress) return specialistProgress;
    const prog = generationActivity?.progress;
    if (prog?.specialistPhase && prog.specialistIndex !== undefined && prog.specialistTotal !== undefined) {
      return {
        phaseName: specialistPhaseLabel(prog.specialistPhase),
        currentJob: prog.specialistIndex,
        totalJobs: prog.specialistTotal,
        isPreserved: Boolean(prog.isPreservedSpecialist),
      };
    }
    if (activeSpecialistPhase) {
      return {
        phaseName: specialistPhaseLabel(activeSpecialistPhase),
        currentJob: 1,
        totalJobs: 1,
        isPreserved: false,
      };
    }
    if (prog?.label) {
      const match = prog.label.match(/(?:reusing saved\s+)?.*?specialist\s+(\d+)\s+of\s+(\d+):\s*(.+)/i);
      if (match) {
        return {
          phaseName: specialistPhaseLabel(match[3].trim()),
          currentJob: parseInt(match[1], 10),
          totalJobs: parseInt(match[2], 10),
          isPreserved: /reusing saved/i.test(prog.label),
        };
      }
    }
    return null;
  }, [specialistProgress, activeSpecialistPhase, generationActivity?.progress]);

  return (
    <div id="forge-stage-container" className="py-6 px-3 sm:px-6 space-y-6 max-w-full overflow-hidden break-words pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="border-b border-[var(--ink-soft)] pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-apparatus font-semibold uppercase tracking-widest text-[var(--graphite)]">
            Stage 04 · The Forge
          </span>
          <h2 className="text-2xl font-manuscript font-normal text-[var(--ink)] mt-1">
            Inking the manuscript.
          </h2>
          <p className="text-xs text-[var(--graphite)] font-manuscript mt-1">
            Six checkpointed bundles for <span className="italic">{workingTitle}</span>{boundedSpecialists ? "; bundles run bounded specialist requests with preserved checkpoints." : "."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
          {!isForging && hasCheckpoint && !forgeError && onContinueForge && (
            <button
              type="button"
              onClick={onContinueForge}
              className="btn-primary min-h-[44px] px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Feather size={12} />
              <span>Continue with next bundle</span>
            </button>
          )}
          {forgeError && onRetryForge && (
            <button
              id="retry-forge-header-btn"
              type="button"
              onClick={onRetryForge}
              disabled={isForging}
              className="btn-primary min-h-[44px] px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Feather size={12} className={isForging ? "text-[var(--rubric)] animate-pulse" : ""} />
              <span>{isForging ? "Forging In Progress..." : "Retry Forge"}</span>
            </button>
          )}

          {!isForging && document && !hasCheckpoint && (
            <button
              id="proceed-to-refine-btn"
              type="button"
              onClick={onProceedToRefine}
              className="btn-primary min-h-[44px] px-4 py-2.5 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>Review Finished Manuscript</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {generationActivity && <GenerationActivity {...generationActivity} />}

      {/* Specialist Progress & Preserved vs Pending Banner */}
      {specialistInfo && (
        <div className="manuscript-sheet p-4 border-l-4 border-l-[var(--rubric)] bg-[var(--vellum-raised)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-ink-bleed">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                Specialist Phase:
              </span>
              <span className="font-manuscript text-base font-bold text-[var(--ink)]">
                {specialistInfo.phaseName}
              </span>
            </div>
            <div className="text-xs font-apparatus text-[var(--graphite)] flex flex-wrap items-center gap-2">
              <span className="font-mono-ui font-semibold text-[var(--ink)]">
                {`Job ${specialistInfo.currentJob} of ${specialistInfo.totalJobs}`}
              </span>
              <span>·</span>
              <span>{`${Math.max(0, specialistInfo.currentJob - 1)} completed`}</span>
              <span>·</span>
              <span>{`${Math.max(0, specialistInfo.totalJobs - specialistInfo.currentJob)} remaining`}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {specialistInfo.isPreserved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-700/30 text-[11px] font-apparatus uppercase tracking-wider font-semibold">
                <CheckCircle2 size={13} />
                <span>Preserved Work</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[var(--rubric)]/10 text-[var(--rubric)] border border-[var(--rubric)]/20 text-[11px] font-apparatus uppercase tracking-wider font-semibold">
                <Feather size={13} className="animate-pulse" />
                <span>Pending Work</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Honest Error Banner if Forge failed */}
      {forgeError && (
        <div className="p-4 border border-[var(--rubric)] bg-[var(--vellum-raised)] rounded-[2px] flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-[var(--rubric)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--rubric)]">
                Forge Synthesis Interrupted
              </h4>
              <p className="text-xs font-manuscript text-[var(--ink)] mt-1">
                {forgeError}
              </p>
              <p className="text-[11px] font-manuscript italic text-[var(--graphite)] mt-0.5">
                No mock data was substituted. Already inked bundles remain visible below.
              </p>
            </div>
          </div>
          {onRetryForge && (
            <button
              id="retry-forge-banner-btn"
              type="button"
              onClick={onRetryForge}
              disabled={isForging}
              className="btn-primary min-h-[44px] px-4 py-2.5 text-xs shrink-0 flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Feather size={12} className={isForging ? "text-[var(--rubric)] animate-pulse" : ""} />
              <span>{isForging ? "Inking..." : "Retry Forge"}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Split: Left is Live Streaming Manuscript, Right is Scribe Build Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Arriving Manuscript Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Working Title Sheet */}
          <div className="manuscript-sheet p-6">
            <div className="flex justify-between items-baseline mb-4 border-b border-[var(--ink-soft)] pb-2">
              <span className="text-[10px] font-mono-ui text-[var(--graphite)] uppercase tracking-wider">
                Working Manuscript · [P] Constant
              </span>
              <span className="text-xs font-hand text-[var(--ink-blue)]">
                {isForging ? "Inking onto vellum…" : "Parchment dried & bound"}
              </span>
            </div>

            <h1 className="text-3xl font-manuscript font-bold text-[var(--ink)] mb-2 tracking-tight">
              {streamedSections.core?.title || workingTitle}
            </h1>

            {streamedSections.core?.pitch ? (
              <p className="text-base font-manuscript text-[var(--ink)] italic leading-relaxed animate-ink-bleed">
                “{streamedSections.core.pitch}”
              </p>
            ) : (
              <div className="h-4 w-3/4 border-b border-dashed border-[var(--ink-soft)] animate-pulse" />
            )}

            {/* Core Mechanics */}
            {streamedSections.core && (
              <div className="mt-6 pt-4 border-t border-[var(--ink-soft)] space-y-3 text-xs font-manuscript animate-ink-bleed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                      The Rule
                    </span>
                    <p className="text-[var(--ink)] leading-snug mt-0.5">
                      {streamedSections.core.theRule}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                      The Cost
                    </span>
                    <p className="text-[var(--ink)] leading-snug mt-0.5">
                      {streamedSections.core.theCost}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--ink-soft)]/50">
                  <div>
                    <span className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                      The Situation
                    </span>
                    <p className="text-[var(--ink)] leading-snug mt-0.5">
                      {streamedSections.core.theSituation}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                      The Pressure
                    </span>
                    <p className="text-[var(--ink)] leading-snug mt-0.5">
                      {streamedSections.core.thePressure}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Hook Section */}
          {streamedSections.user && (
            <div className="manuscript-sheet p-6 animate-ink-bleed">
              <div className="scribe-header">
                <span>User Role & Hierarchy</span>
                <span className="text-[10px] font-mono-ui">[P]</span>
              </div>
              <div className="text-xs font-manuscript space-y-2 text-[var(--ink)]">
                <p>
                  <strong className="font-apparatus text-[10px] uppercase text-[var(--graphite)]">
                    Position:
                  </strong>{" "}
                  {streamedSections.user.rolePosition}
                </p>
                <p>
                  <strong className="font-apparatus text-[10px] uppercase text-[var(--graphite)]">
                    Starts With:
                  </strong>{" "}
                  {streamedSections.user.startsWith}
                </p>
                <p className="pt-2 text-[var(--graphite)] italic border-t border-[var(--ink-soft)]/40">
                  Hook: {streamedSections.user.hookPull} · {streamedSections.user.hookPush} · {streamedSections.user.hookTrap}
                </p>
              </div>
            </div>
          )}

          {/* World Physics */}
          {streamedSections.worldPhysics && (
            <div className="manuscript-sheet p-6 animate-ink-bleed">
              <div className="scribe-header">
                <span>World Physics & Limits</span>
                <span className="text-[10px] font-mono-ui">[C] Lorebook</span>
              </div>
              <div className="space-y-3 text-xs font-manuscript">
                {streamedSections.worldPhysics.rules?.map((r: any, idx: number) => (
                  <div key={idx} className="pb-2 border-b border-[var(--ink-soft)]/40">
                    <p className="font-semibold text-[var(--ink)]">
                      {r.fields?.rule || `RULE ${idx + 1}`}
                    </p>
                    <p className="text-[var(--graphite)] text-[11px] mt-0.5">
                      Profits: {r.fields?.profits} · Pays: {r.fields?.pays}
                    </p>
                  </div>
                ))}
                <div className="pt-1 text-[11px] text-[var(--graphite)] italic">
                  <strong>Authority Check:</strong> {streamedSections.worldPhysics.authorityCheck}
                </div>
              </div>
            </div>
          )}

          {/* Status Block */}
          {streamedSections.status && (
            <div className="manuscript-sheet p-5 animate-ink-bleed bg-[var(--vellum-raised)]">
              <div className="scribe-header">
                <span>Current Status Block</span>
                <span className="text-[10px] font-mono-ui">@ Depth 4 · Order 50</span>
              </div>
              <p className="text-xs font-manuscript leading-relaxed text-[var(--ink)]">
                {streamedSections.status.content}
              </p>
            </div>
          )}

          {/* NPC Seeds Preview */}
          {Array.isArray(streamedSections.npcs) && streamedSections.npcs.length > 0 && (
            <div className="manuscript-sheet p-6 animate-ink-bleed">
              <div className="scribe-header">
                <span>NPC Cast Seeds</span>
                <span className="text-[10px] font-mono-ui">
                  {streamedSections.npcs.length} cast members
                </span>
              </div>
              <div className="space-y-4">
                {streamedSections.npcs.slice(0, 3).map((npc: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-[var(--rubric)] pl-3 text-xs font-manuscript">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-[var(--ink)]">{npc.fields?.name}</span>
                      <span className="text-[10px] text-[var(--graphite)]">{npc.fields?.role}</span>
                    </div>
                    <p className="text-[var(--graphite)] text-[11px] mt-0.5">
                      <strong>Wants:</strong> {npc.fields?.wants}
                    </p>
                    <p className="italic text-[var(--ink)] text-[11px] mt-0.5">
                      {npc.fields?.voice}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsing placeholder line while still forging */}
          {isForging && (
            <div className="manuscript-sheet p-5">
              <RuledLinesSkeleton lines={4} caption="Scribing remaining lorebook entries, secrets, and opening into the vellum…" />
            </div>
          )}
        </div>

        {/* Right 1 Col: Scribe Live Build Log */}
        <div className="manuscript-sheet p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-2">
            <span className="text-[11px] uppercase tracking-wider font-apparatus font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <Feather size={12} className="text-[var(--rubric)]" />
              Build Log
            </span>
            <span className="text-[10px] font-mono-ui text-[var(--graphite)]">
              {buildLogs.length} events
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {buildLogs.map((log) => (
              <div
                key={log.id}
                className="text-xs flex items-start gap-2 py-1 border-b border-[var(--ink-soft)]/30 font-apparatus"
              >
                {log.status === "done" ? (
                  <CheckCircle2 size={12} className="text-[var(--sage)] shrink-0 mt-0.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[var(--rubric)] shrink-0 mt-1 animate-pulse" />
                )}
                <div className="leading-snug">
                  <span
                    className={`text-[11px] ${
                      log.status === "done" ? "text-[var(--ink)]" : "text-[var(--rubric)] font-medium"
                    }`}
                  >
                    {log.label}
                  </span>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div className="pt-3 border-t border-[var(--ink-soft)] text-[10px] text-[var(--graphite)] font-manuscript italic">
            “Printed ink is the machine&apos;s voice. Every section adheres to density scaling and zero trope labels.”
          </div>
        </div>
      </div>
    </div>
  );
};
