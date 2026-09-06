import React from "react";
import { ConsistencyFinding } from "../../types";

interface ProofreaderHeaderProps {
  findings: ConsistencyFinding[];
  isAuditing: boolean;
  onRunAudit: () => void;
  onClearAll: () => void;
}

export const ProofreaderHeader: React.FC<ProofreaderHeaderProps> = ({
  findings,
  isAuditing,
  onRunAudit,
  onClearAll,
}) => {
  const unresolvedCount = findings.filter((f) => !f.applied && !f.dismissed).length;
  const resolvedCount = findings.filter((f) => f.applied).length;

  return (
    <div
      id="proofreader-grading-tally"
      className="p-3 mb-6 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] flex flex-wrap items-center justify-between gap-3 text-xs font-manuscript"
    >
      <div className="flex items-center gap-3">
        {/* The Grading Mark */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-hand text-2xl text-[var(--gold)] font-bold">
            {unresolvedCount === 0 && findings.length > 0 ? "✓ 0" : unresolvedCount}
          </span>
          <span className="font-apparatus uppercase tracking-wider text-[10px] text-[var(--graphite)]">
            {unresolvedCount === 0 && findings.length > 0
              ? "Marginalia Cleared · Manuscript Approved"
              : "Proofreader Marginalia"}
          </span>
        </div>

        {resolvedCount > 0 && (
          <span className="text-[10px] font-hand text-[var(--sage)]">
            ({resolvedCount} corrections inked)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          id="run-consistency-audit-btn"
          type="button"
          onClick={onRunAudit}
          disabled={isAuditing}
          className="text-xs font-apparatus text-[var(--gold)] hover:text-[var(--ink)] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isAuditing ? "Auditing Manuscript..." : "Run Consistency Pass"}
        </button>

        {unresolvedCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] font-apparatus text-[var(--graphite)] hover:text-[var(--rubric)] uppercase tracking-wider transition-colors cursor-pointer"
          >
            Dismiss All
          </button>
        )}
      </div>
    </div>
  );
};

interface ProofreaderMarginNoteProps {
  finding: ConsistencyFinding;
  onApplyFix: (finding: ConsistencyFinding) => void;
  onDismiss: (findingId: string) => void;
}

export const ProofreaderMarginNote: React.FC<ProofreaderMarginNoteProps> = ({
  finding,
  onApplyFix,
  onDismiss,
}) => {
  if (finding.dismissed) return null;

  return (
    <div
      className={`p-2.5 my-2 border-l-2 border-[var(--gold)] bg-[var(--vellum-raised)]/80 text-xs font-manuscript transition-all ${
        finding.applied ? "opacity-60 border-[var(--sage)]" : "animate-ink-bleed"
      }`}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-apparatus uppercase text-[8.5px] tracking-widest text-[var(--gold)] font-bold">
          Proofreader's Query · {finding.type.replace(/_/g, " ")}
        </span>
        {!finding.applied && (
          <button
            type="button"
            onClick={() => onDismiss(finding.id)}
            className="text-[9px] text-[var(--graphite)] hover:text-[var(--ink)] uppercase font-apparatus"
            title="Dismiss note"
          >
            ✕
          </button>
        )}
      </div>

      {/* Handwritten corrector's note */}
      <p className="font-hand text-lg leading-snug text-[var(--ink-blue)] mb-2">
        “{finding.explanation}”
      </p>

      {/* Suggested Fix */}
      {finding.suggestedFix && !finding.applied && (
        <div className="pt-1.5 border-t border-[var(--ink-soft)]/40 flex items-baseline justify-between gap-2">
          <div className="truncate text-[11px] text-[var(--graphite)]">
            <span className="font-apparatus uppercase text-[8px] mr-1">Fix:</span>
            <span className="italic font-manuscript text-[var(--ink)]">{finding.suggestedFix}</span>
          </div>

          <button
            type="button"
            onClick={() => onApplyFix(finding)}
            className="text-[10px] font-apparatus font-bold uppercase tracking-wider text-[var(--gold)] hover:text-[var(--ink)] shrink-0 cursor-pointer"
          >
            Apply Fix
          </button>
        </div>
      )}

      {finding.applied && (
        <span className="font-hand text-sm text-[var(--sage)] block pt-1">
          ✓ Corrected & inked in place
        </span>
      )}
    </div>
  );
};
