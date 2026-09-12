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

  if (status === "idle" && !progress) return null;
  return <section className="border border-[var(--ink-soft)] bg-[var(--vellum-raised)]/70 p-3" aria-label={`${taskLabel(task)} activity`}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      <strong className="font-apparatus uppercase tracking-wider text-[var(--ink)]">{taskLabel(task)}</strong>
      <span className="text-[var(--ink-blue)]">{progress?.label || (status === "cancelled" ? "Stopped" : status)}</span>
      {progress?.attempt && progress.maxAttempts && <span className="font-mono-ui text-[var(--graphite)]">{`attempt ${progress.attempt} of ${progress.maxAttempts}`}</span>}
      {progress?.totalSteps !== undefined && progress.completedSteps !== undefined && <span className="font-mono-ui text-[var(--graphite)]">{`${progress.completedSteps} / ${progress.totalSteps} steps`}</span>}
      <span className="font-mono-ui text-[var(--graphite)]">{elapsedLabel(startedAt, now)}</span>
      {lastEventAt && status === "active" && <span className="text-emerald-700">● Server connected</span>}
      {lastProviderActivityAt && status === "active" && <span className="text-emerald-700">● Provider active</span>}
      {status === "cancelled" && <span className="text-[var(--graphite)]">Stopped</span>}
      {status === "active" && <button type="button" onClick={onCancel} className="ml-auto border border-[var(--rubric)] px-2 py-1 font-apparatus uppercase tracking-wider text-[var(--rubric)] hover:bg-[var(--rubric)] hover:text-white">{cancelLabel(task)}</button>}
    </div>
    {status === "error" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rubric)]/40 pt-2 text-[10px]">
      <span className="italic text-[var(--graphite)]">Your existing work was preserved.</span>
      {onOpenConnections && <button type="button" onClick={onOpenConnections} className="btn-secondary px-2 py-1">Connections</button>}
    </div>}
    {usageParts.length > 0 && <p className="mt-2 font-mono-ui text-[10px] text-[var(--graphite)]">Completed usage: {usageParts.join(" · ")}</p>}
    {status === "active" && outputCharacters > 0 && usage.outputTokens === undefined && <p className="mt-2 font-mono-ui text-[10px] text-[var(--graphite)]">~{Math.ceil(outputCharacters / 4).toLocaleString()} output tokens estimated from streamed characters</p>}
    <div className="mt-2 border-t border-[var(--ink-soft)] pt-2 text-[10px]">
      {reasoning ? <><button type="button" onClick={() => setReasoningOpen((open) => !open)} className="font-apparatus uppercase tracking-wider text-[var(--ink-blue)]">{reasoningOpen ? "Hide reasoning" : "View reasoning"}</button>{reasoningTruncated && <span className="ml-2 text-[var(--graphite)]">Reasoning truncated for display.</span>}{reasoningOpen && <div className="mt-2"><p className="mb-1 text-[var(--graphite)]">Provider-returned reasoning may be incomplete, repetitive, or unavailable.</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border border-[var(--ink-soft)] bg-[var(--vellum)] p-2 font-mono-ui text-[10px]">{reasoning}</pre><button type="button" onClick={onClearReasoning} className="mt-1 text-[var(--graphite)] underline">Clear reasoning</button></div>}</> : <span className="text-[var(--graphite)]">{status === "active" ? "Waiting for provider reasoning — some providers return only a summary or token count." : "Reasoning unavailable — this provider/model did not return a reasoning field."}</span>}
    </div>
  </section>;
};
