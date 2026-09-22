import React, { useEffect, useMemo, useState } from "react";
import type { GenerationProgressEvent, GenerationTask, GenerationUsage } from "../contracts/generationProgress";

export interface GenerationActivityProps {
  task: GenerationTask;
  progress: GenerationProgressEvent | null;
  startedAt: number | null;
  usage: GenerationUsage;
  reasoning: string;
  reasoningTruncated: boolean;
  status: "idle" | "active" | "cancelled" | "complete" | "error";
  lastEventAt?: number | null;
  lastProviderActivityAt?: number | null;
  outputCharacters?: number;
  onCancel: () => void;
  onClearReasoning: () => void;
  onOpenConnections?: () => void;
}

function taskLabel(task: GenerationTask): string {
  return task === "anchors" ? "Anchor Scribing" : task === "premises" ? "Fresh Premises" : task === "divergence" ? "Divergence" : "Forge";
}

function cancelLabel(task: GenerationTask): string {
  return task === "anchors" ? "Stop Scribing" : task === "premises" ? "Stop premise generation" : task === "divergence" ? "Cancel Generation" : "Cancel Forge";
}

function elapsedLabel(startedAt: number | null, now: number): string {
  if (!startedAt) return "0:00";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function specialistPhaseLabel(destinationOrKey: string): string {
  const map: Record<string, string> = {
    core: "Core Premise & Operating Rules",
    user: "Player Role & Boundaries",
    worldPhysics: "World Physics & Limits",
    status: "Starting Snapshot & Status",
    locations: "Playable Locations",
    factions: "Autonomous Factions",
    npcs: "Cast & Roster",
    relationshipWeb: "Social & Relationship Web",
    knowledgeMap: "Knowledge & Secret Boundaries",
    items: "Usable Items & Artifacts",
    secrets: "Concealed Secrets & Truths",
    conflict: "Conflict Architecture",
    pressureProtocol: "Pressure Escalation Protocol",
    history: "Historical Precedents",
    aesthetic: "Sensory & Visual Aesthetic",
    naming: "Linguistic & Naming Conventions",
    pressures: "Active World Pressures",
    additionalLore: "Supplemental Setting Lore",
    proceduralRolls: "Procedural Roll Tables",
    opening: "Playable Opening Scene",
    expansionNotes: "Expansion & Safety Boundaries",
    antiGravity: "Anti-Gravity Grounding",
    buildNotes: "Build & Format Metadata",
  };
  return map[destinationOrKey] ?? destinationOrKey;
}

export const GenerationActivity: React.FC<GenerationActivityProps> = ({
  task, progress, startedAt, usage, reasoning, reasoningTruncated, status, lastEventAt, lastProviderActivityAt, outputCharacters = 0, onCancel, onClearReasoning, onOpenConnections,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [reasoningOpen, setReasoningOpen] = useState(false);
  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);
  const usageParts = useMemo(() => [
    usage.inputTokens !== undefined ? `${usage.inputTokens.toLocaleString()} input` : null,
    usage.outputTokens !== undefined ? `${usage.outputTokens.toLocaleString()} output` : null,
    usage.reasoningTokens !== undefined ? `${usage.reasoningTokens.toLocaleString()} reasoning` : null,
  ].filter(Boolean), [usage]);

  const specialistData = useMemo(() => {
    if (progress?.specialistPhase && progress.specialistIndex !== undefined && progress.specialistTotal !== undefined) {
      return {
        phase: specialistPhaseLabel(progress.specialistPhase),
        current: progress.specialistIndex,
        total: progress.specialistTotal,
        isPreserved: Boolean(progress.isPreservedSpecialist),
      };
    }
    if (!progress?.label) return null;
    const match = progress.label.match(/(?:reusing saved\s+)?.*?specialist\s+(\d+)\s+of\s+(\d+):\s*(.+)/i);
    if (match) {
      const isPreserved = /reusing saved/i.test(progress.label);
      return {
        phase: specialistPhaseLabel(match[3].trim()),
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
        isPreserved,
      };
    }
    return null;
  }, [progress]);

  if (status === "idle" && !progress) return null;
  return <section className="w-full max-w-full overflow-hidden border border-[var(--ink-soft)] bg-[var(--vellum-raised)]/70 p-3 sm:p-4 text-left" aria-label={`${taskLabel(task)} activity`}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
      <strong className="font-apparatus uppercase tracking-wider text-[var(--ink)]">{taskLabel(task)}</strong>
      <span className="text-[var(--ink-blue)]">{progress?.label || (status === "cancelled" ? "Stopped" : status)}</span>
      {progress?.attempt && progress.maxAttempts && <span className="font-mono-ui text-[var(--graphite)]">{`attempt ${progress.attempt} of ${progress.maxAttempts}`}</span>}
      {progress?.totalSteps !== undefined && progress.completedSteps !== undefined && <span className="font-mono-ui text-[var(--graphite)]">{`${progress.completedSteps} / ${progress.totalSteps} steps`}</span>}
      <span className="font-mono-ui text-[var(--graphite)]">{elapsedLabel(startedAt, now)}</span>
      {lastEventAt && status === "active" && <span className="text-emerald-700">● Server connected</span>}
      {lastProviderActivityAt && status === "active" && <span className="text-emerald-700">● Provider active</span>}
      {status === "cancelled" && <span className="text-[var(--graphite)]">Stopped</span>}
      {status === "active" && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-[var(--rubric)] px-3 py-2 font-apparatus uppercase tracking-wider text-[var(--rubric)] hover:bg-[var(--rubric)] hover:text-white transition-colors"
        >
          {cancelLabel(task)}
        </button>
      )}
    </div>

    {/* Specialist Phase & Preserved vs Pending Ledger Indicator */}
    {specialistData && (
      <div className="mt-3 pt-2.5 border-t border-[var(--ink-soft)]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-apparatus">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--graphite)]">
            Active Specialist Phase:
          </span>
          <span className="font-bold text-[var(--ink)]">
            {specialistData.phase}
          </span>
          <span className="font-mono-ui text-[11px] text-[var(--graphite)]">
            {`(Job ${specialistData.current} of ${specialistData.total} · ${Math.max(0, specialistData.current - 1)} completed · ${Math.max(0, specialistData.total - specialistData.current)} remaining)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {specialistData.isPreserved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-700/30 text-[10px] uppercase tracking-wider font-semibold">
              ✓ Preserved Work
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--rubric)]/10 text-[var(--rubric)] border border-[var(--rubric)]/20 text-[10px] uppercase tracking-wider font-semibold">
              ● Pending Work
            </span>
          )}
        </div>
      </div>
    )}

    {status === "error" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rubric)]/40 pt-2 text-[10px]">
      <span className="italic text-[var(--graphite)]">Your existing work was preserved.</span>
      {onOpenConnections && (
        <button
          type="button"
          onClick={onOpenConnections}
          className="btn-secondary min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2"
        >
          Connections
        </button>
      )}
    </div>}
    {usageParts.length > 0 && <p className="mt-2 font-mono-ui text-[10px] text-[var(--graphite)]">Completed usage: {usageParts.join(" · ")}</p>}
    {status === "active" && outputCharacters > 0 && usage.outputTokens === undefined && <p className="mt-2 font-mono-ui text-[10px] text-[var(--graphite)]">~{Math.ceil(outputCharacters / 4).toLocaleString()} output tokens estimated from streamed characters</p>}
    <div className="mt-2 border-t border-[var(--ink-soft)] pt-2 text-[10px]">
      {reasoning ? (
        <>
          <button
            type="button"
            onClick={() => setReasoningOpen((open) => !open)}
            className="min-h-[44px] inline-flex items-center font-apparatus uppercase tracking-wider text-[var(--ink-blue)] hover:underline"
          >
            {reasoningOpen ? "Hide reasoning" : "View reasoning"}
          </button>
          {reasoningTruncated && <span className="ml-2 text-[var(--graphite)]">Reasoning truncated for display.</span>}
          {reasoningOpen && (
            <div className="mt-2">
              <p className="mb-1 text-[var(--graphite)]">Provider-returned reasoning may be incomplete, repetitive, or unavailable.</p>
              <pre className="max-h-64 max-w-full overflow-x-auto whitespace-pre-wrap break-words border border-[var(--ink-soft)] bg-[var(--vellum)] p-2 font-mono-ui text-[10px]">{reasoning}</pre>
              <button
                type="button"
                onClick={onClearReasoning}
                className="min-h-[44px] inline-flex items-center mt-1 text-[var(--graphite)] underline hover:text-[var(--ink)]"
              >
                Clear reasoning
              </button>
            </div>
          )}
        </>
      ) : (
        <span className="text-[var(--graphite)]">{status === "active" ? "Waiting for provider reasoning — some providers return only a summary or token count." : "Reasoning unavailable — this provider/model did not return a reasoning field."}</span>
      )}
    </div>
  </section>;
};
