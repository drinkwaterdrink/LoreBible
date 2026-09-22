import React, { useState } from "react";
import type { GenerationTelemetryView } from "./types";
import { Loader2, X, ChevronUp, ChevronDown } from "lucide-react";

interface ActivityShelfProps {
  telemetry: GenerationTelemetryView;
  className?: string;
}

function formatElapsed(ms: number | null): string | null {
  if (typeof ms !== "number" || ms < 0) return null;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${mins}m ${remSec}s`;
}

export const ActivityShelf: React.FC<ActivityShelfProps> = ({ telemetry, className = "" }) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  if (!telemetry.isGenerating) {
    return null;
  }

  const elapsedText = formatElapsed(telemetry.elapsedMs);
  const tokenText = typeof telemetry.outputTokens === "number" ? `${telemetry.outputTokens.toLocaleString()} tokens` : null;

  return (
    <>
      {/* Desktop Bottom Shelf (thin dock strip along bottom of workspace) */}
      <div
        id="adventure-desktop-activity-shelf"
        aria-live="polite"
        className={`adventure-shelf hidden md:flex items-center justify-between px-4 py-2 bg-[var(--surface-sidebar)]/95 backdrop-blur-md border-t border-[var(--border-gold)] text-xs font-apparatus select-none shadow-lg z-30 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Loader2 size={15} className="animate-spin text-[var(--accent-gold)] shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">
              {telemetry.taskLabel}
            </span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="text-[var(--accent-gold)]">
              {telemetry.specialistPhase || telemetry.phaseLabel}
            </span>
            {typeof telemetry.specialistIndex === "number" && typeof telemetry.specialistTotal === "number" && (
              <span className="font-mono-ui text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                Job {telemetry.specialistIndex} of {telemetry.specialistTotal}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-ui text-[var(--text-muted)]">
          {telemetry.modelName && <span>{telemetry.modelName}</span>}
          {telemetry.modelName && (tokenText || elapsedText) && <span>·</span>}
          {tokenText && <span>{tokenText}</span>}
          {tokenText && elapsedText && <span>·</span>}
          {elapsedText && <span>{elapsedText}</span>}

          {telemetry.canCancel && telemetry.onCancel && (
            <button
              type="button"
              onClick={telemetry.onCancel}
              className="ml-2 px-2.5 py-1 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--status-danger)]/50 text-[var(--status-danger)] hover:bg-[var(--status-danger)] hover:text-white font-apparatus text-xs font-semibold transition-colors cursor-pointer"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Mobile Floating Pill (above bottom navigation) */}
      <div
        id="adventure-mobile-activity-pill"
        className="adventure-shelf md:hidden fixed bottom-16 left-3 right-3 z-30 flex flex-col items-center"
      >
        <div
          className="w-full max-w-sm rounded-[4px] bg-[var(--surface-sidebar)]/95 backdrop-blur-md border border-[var(--border-gold)] p-2.5 shadow-xl select-none"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 size={14} className="animate-spin text-[var(--accent-gold)] shrink-0" />
              <div className="truncate text-xs text-[var(--text-primary)] font-semibold">
                <span>{telemetry.taskLabel}</span>
                <span className="text-[var(--text-muted)] mx-1">·</span>
                <span className="text-[var(--accent-gold)]">{telemetry.specialistPhase || telemetry.phaseLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Toggle telemetry details"
              >
                {isMobileExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>

              {telemetry.canCancel && telemetry.onCancel && (
                <button
                  type="button"
                  onClick={telemetry.onCancel}
                  className="px-2 py-0.5 rounded-[2px] bg-[var(--status-danger)]/20 border border-[var(--status-danger)]/60 text-[var(--status-danger)] text-[10px] font-semibold"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {isMobileExpanded && (
            <div className="mt-2 pt-2 border-t border-[var(--border-soft)] text-[10px] font-mono-ui text-[var(--text-muted)] space-y-1">
              {telemetry.modelName && <div>Model: {telemetry.modelName}</div>}
              {tokenText && <div>Output: {tokenText}</div>}
              {elapsedText && <div>Elapsed: {elapsedText}</div>}
              {typeof telemetry.specialistIndex === "number" && typeof telemetry.specialistTotal === "number" && (
                <div>Specialist: Job {telemetry.specialistIndex} of {telemetry.specialistTotal}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
