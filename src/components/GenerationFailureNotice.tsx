import React from "react";
import { AlertTriangle, KeyRound, RotateCcw } from "lucide-react";

interface GenerationFailureNoticeProps {
  message: string;
  onRetry?: () => void;
  onOpenConnections?: () => void;
}

export function GenerationFailureNotice({ message, onRetry, onOpenConnections }: GenerationFailureNoticeProps) {
  return <div role="alert" className="flex flex-wrap items-start gap-3 border border-[var(--rubric)] bg-[var(--vellum-raised)] p-3 text-xs">
    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--rubric)]" />
    <div className="min-w-0 flex-1">
      <p className="font-manuscript text-[var(--ink)]">{message}</p>
      <p className="mt-1 text-[11px] italic text-[var(--graphite)]">Your existing work was preserved.</p>
    </div>
    <div className="flex gap-2">
      {onRetry && <button type="button" onClick={onRetry} className="btn-secondary flex items-center gap-1 px-2 py-1"><RotateCcw size={11} />Retry</button>}
      {onOpenConnections && <button type="button" onClick={onOpenConnections} className="btn-secondary flex items-center gap-1 px-2 py-1"><KeyRound size={11} />Connections</button>}
    </div>
  </div>;
}
