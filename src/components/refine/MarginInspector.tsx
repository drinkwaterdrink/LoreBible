import React, { useState } from "react";
import { ConsistencyFinding, Entry, LoreBibleDocument, RippleNotice, VariantSlip } from "../../types";
import { ProofreaderMarginNote } from "./ProofreaderMarkup";

interface MarginInspectorProps {
  document: LoreBibleDocument;
  selectedEntry: Entry | null;
  selectedSectionKey: string | null;
  selectedSectionTitle?: string;
  findingsForSelected: ConsistencyFinding[];
  allFindings: ConsistencyFinding[];
  onApplyFindingFix: (finding: ConsistencyFinding) => void;
  onDismissFinding: (findingId: string) => void;
  onToggleLock: (sectionKey: string, entryId: string) => void;
  onRerollEntry: (sectionKey: string, entryId: string, instruction?: string) => void;
  isRerollingEntry: boolean;
  onFetchVariants: (sectionKey: string, entryId: string) => void;
  variants: VariantSlip[] | null;
  isLoadingVariants: boolean;
  onPickVariant: (sectionKey: string, entryId: string, variant: VariantSlip) => void;
  onDismissVariants: () => void;
  onPushEntry: (sectionKey: string, entryId: string, instruction: string) => void;
  isPushingEntry: boolean;
  onSaveMarginNote: (sectionKey: string, entryId: string, noteText: string, useAsInstruction: boolean) => void;
  onDuplicateEntry: (sectionKey: string, entryId: string) => void;
  onDeleteEntry: (sectionKey: string, entryId: string) => void;
  rippleNotice: RippleNotice | null;
  onRegenerateRippleReferences: (ripple: RippleNotice) => void;
  onCloseSelection?: () => void;
}

export const MarginInspector: React.FC<MarginInspectorProps> = ({
  document,
  selectedEntry,
  selectedSectionKey,
  selectedSectionTitle,
  findingsForSelected,
  allFindings,
  onApplyFindingFix,
  onDismissFinding,
  onToggleLock,
  onRerollEntry,
  isRerollingEntry,
  onFetchVariants,
  variants,
  isLoadingVariants,
  onPickVariant,
  onDismissVariants,
  onPushEntry,
  isPushingEntry,
  onSaveMarginNote,
  onDuplicateEntry,
  onDeleteEntry,
  rippleNotice,
  onRegenerateRippleReferences,
  onCloseSelection,
}) => {
  const [isPushInputOpen, setIsPushInputOpen] = useState(false);
  const [pushText, setPushText] = useState("");
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);
  const [noteText, setNoteText] = useState(selectedEntry?.note || "");
  const [useNoteAsInstruction, setUseNoteAsInstruction] = useState(false);

  // Synchronize noteText when selectedEntry changes
  React.useEffect(() => {
    setNoteText(selectedEntry?.note || "");
    setIsPushInputOpen(false);
    setIsNoteInputOpen(false);
  }, [selectedEntry?.id]);

  // If NO entry is selected, show the default margin context inspector
  if (!selectedEntry || !selectedSectionKey) {
    const unappliedFindings = allFindings.filter((f) => !f.applied && !f.dismissed);

    return (
      <aside
        id="margin-context-inspector"
        aria-label="Margin Context Inspector"
        className="h-full space-y-6 text-xs font-manuscript select-none"
      >
        {/* Header */}
        <div className="border-b border-[var(--ink-soft)]/50 pb-2">
          <span className="font-apparatus uppercase tracking-widest text-[9px] text-[var(--graphite)] block">
            Annotation Margin
          </span>
          <span className="font-manuscript italic text-[var(--ink)]">
            Manuscript Context & Keys
          </span>
        </div>

        {/* Proofreader queries if available */}
        {unappliedFindings.length > 0 && (
          <div className="space-y-3">
            <span className="font-apparatus uppercase text-[9px] tracking-wider text-[var(--gold)] font-bold block">
              Active Proofreader Queries ({unappliedFindings.length})
            </span>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {(unappliedFindings || []).slice(0, 4).map((finding) => (
                <ProofreaderMarginNote
                  key={finding.id}
                  finding={finding}
                  onApplyFix={onApplyFindingFix}
                  onDismiss={onDismissFinding}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global Manuscript Keys */}
        <div>
          <span className="font-apparatus uppercase text-[9px] tracking-wider text-[var(--graphite)] block mb-1.5 font-semibold">
            Trigger Keys in Circulation
          </span>
          <div className="flex flex-wrap gap-1.5">
            {["locations", "factions", "npcs", "items", "secrets"].flatMap((key) => {
              const list = (document as any)[key] || [];
              return list.flatMap((e: Entry) => e.keys || []);
            }).slice(0, 16).map((k, i) => (
              <span key={i} className="lore-key-tag">
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Permanence Legend */}
        <div className="p-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] space-y-1.5 text-[11px] text-[var(--ink)]">
          <span className="font-apparatus uppercase text-[9px] tracking-wider text-[var(--graphite)] block font-semibold">
            Permanence Routing
          </span>
          <p>
            <strong className="text-[var(--rubric)] font-mono-ui">[P]</strong> Constant —
            Injected at every step.
          </p>
          <p>
            <strong className="text-[var(--sage)] font-mono-ui">[C]</strong> Conditional —
            Injected via Lorebook trigger keys.
          </p>
          <p>
            <strong className="text-[var(--gold)] font-mono-ui">[T]</strong> Transient —
            First scene / opening only.
          </p>
        </div>

        {/* Quiet prompt */}
        <p className="font-hand text-base text-[var(--ink-blue)] opacity-80 pt-2">
          Click any entry in the manuscript to inspect its keys, roll variants, or ink handwritten revisions.
        </p>
      </aside>
    );
  }

  // An entry IS selected: controls fade in beneath
  const entryName =
    selectedEntry.fields.name ||
    selectedEntry.fields.title ||
    selectedEntry.fields.truth ||
    selectedEntry.fields.role ||
    "Selected Entry";

  return (
    <aside
      id="margin-entry-inspector"
      aria-label="Margin Entry Inspector"
      className="h-full space-y-4 text-xs font-manuscript animate-ink-bleed"
    >
      {/* Selection Header */}
      <div className="border-b border-[var(--ink-soft)]/60 pb-2.5 flex items-baseline justify-between">
        <div>
          <span className="font-apparatus uppercase tracking-widest text-[9px] text-[var(--graphite)] block">
            {selectedSectionTitle || selectedSectionKey} · Entry
          </span>
          <h4 className="font-manuscript font-semibold text-sm text-[var(--ink)] truncate max-w-[200px]">
            {entryName}
          </h4>
        </div>
        {onCloseSelection && (
          <button
            type="button"
            onClick={onCloseSelection}
            className="text-[10px] font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
          >
            Done
          </button>
        )}
      </div>

      {/* Trigger Keys & Permanence */}
      <div className="space-y-1">
        <span className="font-apparatus uppercase text-[8.5px] tracking-wider text-[var(--graphite)] block">
          Trigger Keys
        </span>
        <div className="flex flex-wrap gap-1">
          {selectedEntry.keys && selectedEntry.keys.length > 0 ? (
            selectedEntry.keys.map((k, i) => (
              <span key={i} className="lore-key-tag">
                {k}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-[var(--graphite)] italic">No trigger keys</span>
          )}
        </div>
      </div>

      {/* Existing Handwritten Note if present */}
      {selectedEntry.note && (
        <div className="p-2 border-l-2 border-[var(--ink-blue)] bg-[var(--vellum-raised)]">
          <span className="font-apparatus uppercase text-[8px] text-[var(--ink-blue)] block mb-0.5 font-bold">
            Handwritten Margin Annotation
          </span>
          <p className="font-hand text-lg text-[var(--ink-blue)] leading-snug">
            “{selectedEntry.note}”
          </p>
        </div>
      )}

      {/* Proofreader Findings specifically for this selected entry */}
      {findingsForSelected.length > 0 && (
        <div className="space-y-2">
          {findingsForSelected.map((finding) => (
            <ProofreaderMarginNote
              key={finding.id}
              finding={finding}
              onApplyFix={onApplyFindingFix}
              onDismiss={onDismissFinding}
            />
          ))}
        </div>
      )}

      {/* Ripple System Alert Notice */}
      {rippleNotice && rippleNotice.references.length > 0 && (
        <div className="p-3 bg-[var(--vellum-raised)] border-l-2 border-[var(--gold)] text-xs space-y-2 animate-ink-bleed">
          <span className="font-apparatus uppercase text-[8.5px] tracking-widest text-[var(--gold)] font-bold block">
            Ripple System Detection
          </span>
          <p className="font-hand text-lg text-[var(--ink-blue)] leading-tight">
            “{rippleNotice.references.length} entries mention {rippleNotice.sourceName} — review?”
          </p>
          <div className="space-y-1 text-[11px] text-[var(--graphite)] font-manuscript">
            {rippleNotice.references.map((ref, idx) => (
              <p key={idx} className="truncate">
                • <strong className="text-[var(--ink)]">{ref.entryName}</strong> ({ref.sectionTitle})
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onRegenerateRippleReferences(rippleNotice)}
            className="text-[10px] font-apparatus font-bold uppercase tracking-wider text-[var(--gold)] hover:text-[var(--ink)] block pt-1 cursor-pointer"
          >
            Regenerate Referenced Entries
          </button>
        </div>
      )}

      {/* 3 VARIANTS STACKED PAPER SLIPS */}
      {variants && variants.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--ink-soft)]/50">
          <div className="flex items-baseline justify-between">
            <span className="font-apparatus uppercase text-[9px] tracking-wider text-[var(--gold)] font-bold">
              Variant Slips (Pick One)
            </span>
            <button
              type="button"
              onClick={onDismissVariants}
              className="text-[9px] font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-2">
            {variants.map((v) => (
              <div
                key={v.id}
                className="p-2.5 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] shadow-sm hover:border-[var(--gold)] transition-colors space-y-1.5 cursor-pointer group"
                onClick={() => onPickVariant(selectedSectionKey, selectedEntry.id, v)}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-manuscript font-semibold text-xs text-[var(--ink)]">
                    {v.label}
                  </span>
                  <span className="font-apparatus uppercase text-[8px] text-[var(--graphite)]">
                    {v.angle}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--graphite)] leading-snug font-manuscript">
                  {v.preview || Object.values(v.entry.fields)[0]}
                </p>
                <div className="pt-1 flex justify-end">
                  <span className="text-[10px] font-apparatus font-semibold uppercase text-[var(--gold)] group-hover:text-[var(--ink)]">
                    Pick this Slip →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PUSH INPUT FORM */}
      {isPushInputOpen && (
        <div className="p-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] space-y-2 animate-ink-bleed">
          <span className="font-apparatus uppercase text-[8.5px] tracking-widest text-[var(--gold)] font-bold block">
            Handwritten Push Instruction
          </span>
          <input
            type="text"
            value={pushText}
            onChange={(e) => setPushText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pushText.trim()) {
                onPushEntry(selectedSectionKey, selectedEntry.id, pushText);
                setIsPushInputOpen(false);
              }
            }}
            placeholder="e.g. make her older, this should be underground..."
            className="w-full bg-transparent font-hand text-lg text-[var(--ink-blue)] leading-tight p-1 border-b border-[var(--ink-blue)]/50 focus:outline-none"
            autoFocus
          />
          <div className="flex justify-between items-center text-[10px] font-apparatus">
            <button
              type="button"
              onClick={() => setIsPushInputOpen(false)}
              className="text-[var(--graphite)] hover:text-[var(--ink)] uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPushingEntry || !pushText.trim()}
              onClick={() => {
                if (pushText.trim()) {
                  onPushEntry(selectedSectionKey, selectedEntry.id, pushText);
                  setIsPushInputOpen(false);
                }
              }}
              className="text-[var(--gold)] font-bold uppercase tracking-wider hover:text-[var(--ink)] disabled:opacity-50 cursor-pointer"
            >
              {isPushingEntry ? "Rewriting..." : "Apply Push"}
            </button>
          </div>
        </div>
      )}

      {/* MARGIN NOTE INPUT FORM */}
      {isNoteInputOpen && (
        <div className="p-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] space-y-2 animate-ink-bleed">
          <span className="font-apparatus uppercase text-[8.5px] tracking-widest text-[var(--graphite)] font-bold block">
            Permanent Handwritten Annotation
          </span>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Ink a personal observation or constraint..."
            className="w-full bg-transparent font-hand text-lg text-[var(--ink-blue)] leading-snug p-1 border-b border-[var(--ink-blue)]/50 focus:outline-none resize-none"
            autoFocus
          />
          <label className="flex items-center gap-1.5 text-[10px] font-apparatus text-[var(--graphite)] cursor-pointer">
            <input
              type="checkbox"
              checked={useNoteAsInstruction}
              onChange={(e) => setUseNoteAsInstruction(e.target.checked)}
              className="rounded-[1px] accent-[var(--gold)]"
            />
            <span>Use as instruction on future regenerations</span>
          </label>
          <div className="flex justify-between items-center text-[10px] font-apparatus pt-1">
            <button
              type="button"
              onClick={() => setIsNoteInputOpen(false)}
              className="text-[var(--graphite)] hover:text-[var(--ink)] uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveMarginNote(selectedSectionKey, selectedEntry.id, noteText, useNoteAsInstruction);
                setIsNoteInputOpen(false);
              }}
              className="text-[var(--gold)] font-bold uppercase tracking-wider hover:text-[var(--ink)] cursor-pointer"
            >
              Save Annotation
            </button>
          </div>
        </div>
      )}

      {/* PER-ENTRY CONTROLS (Small Ochre Inter text buttons — no icon soup, no floating dark toolbar) */}
      <div className="pt-2 border-t border-[var(--ink-soft)]/50 space-y-1.5 font-apparatus text-[10px]">
        <span className="uppercase tracking-widest text-[8.5px] text-[var(--graphite)] block mb-1">
          Scribe Controls
        </span>

        {/* 1. Reroll */}
        <button
          type="button"
          disabled={isRerollingEntry}
          onClick={() => onRerollEntry(selectedSectionKey, selectedEntry.id)}
          className="w-full text-left py-1 text-[var(--gold)] hover:text-[var(--ink)] uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isRerollingEntry ? "Regenerating Entry..." : "Reroll Entry (Hold Document Constant)"}
        </button>

        {/* 2. Lock / Pin */}
        <button
          type="button"
          onClick={() => onToggleLock(selectedSectionKey, selectedEntry.id)}
          className={`w-full text-left py-1 uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
            selectedEntry.locked
              ? "text-[var(--gold)] hover:text-[var(--rubric)]"
              : "text-[var(--graphite)] hover:text-[var(--gold)]"
          }`}
        >
          {selectedEntry.locked ? "● Locked (Pinned from Regeneration)" : "○ Pin Entry (Survive Regenerations)"}
        </button>

        {/* 3. Variants */}
        <button
          type="button"
          disabled={isLoadingVariants}
          onClick={() => onFetchVariants(selectedSectionKey, selectedEntry.id)}
          className="w-full text-left py-1 text-[var(--gold)] hover:text-[var(--ink)] uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isLoadingVariants ? "Drafting Slips..." : "Draft 3 Variants (Paper Slips)"}
        </button>

        {/* 4. Push */}
        <button
          type="button"
          onClick={() => setIsPushInputOpen(!isPushInputOpen)}
          className="w-full text-left py-1 text-[var(--gold)] hover:text-[var(--ink)] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
        >
          {isPushInputOpen ? "Cancel Push" : "Push (Handwritten One-Line Direction)"}
        </button>

        {/* 5. Margin Note */}
        <button
          type="button"
          onClick={() => setIsNoteInputOpen(!isNoteInputOpen)}
          className="w-full text-left py-1 text-[var(--ink-blue)] hover:text-[var(--ink)] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
        >
          {isNoteInputOpen ? "Cancel Note" : "Ink Margin Annotation"}
        </button>

        {/* 6. Duplicate */}
        <button
          type="button"
          onClick={() => onDuplicateEntry(selectedSectionKey, selectedEntry.id)}
          className="w-full text-left py-1 text-[var(--graphite)] hover:text-[var(--ink)] uppercase tracking-wider font-medium transition-colors cursor-pointer"
        >
          Duplicate Entry
        </button>

        {/* 7. Delete */}
        <button
          type="button"
          onClick={() => onDeleteEntry(selectedSectionKey, selectedEntry.id)}
          className="w-full text-left py-1 text-[var(--rubric)] hover:opacity-80 uppercase tracking-wider font-medium transition-colors cursor-pointer"
        >
          Delete Entry
        </button>
      </div>
    </aside>
  );
};
