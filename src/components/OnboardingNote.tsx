import React, { useState, useEffect } from "react";
import { Feather, ArrowRight, ArrowLeft, Check, X } from "lucide-react";

interface OnboardingNoteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingNote: React.FC<OnboardingNoteProps> = ({ isOpen, onClose }) => {
  const [panelIndex, setPanelIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && panelIndex < 2) {
        setPanelIndex((p) => p + 1);
      } else if (e.key === "ArrowLeft" && panelIndex > 0) {
        setPanelIndex((p) => p - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, panelIndex, onClose]);

  if (!isOpen) return null;

  const panels = [
    {
      roman: "I",
      tag: "Spark & Margin Anchors",
      lead: "Lay down your raw premise. The scriptorium extracts truth.",
      body: "Type any scenario seed or world fragment. The parser automatically isolates non-negotiable canon constraints, register words, and user roles into the Right Margin apparatus before inking.",
      marginHandwriting: "“Never begin without non-negotiable anchors.”",
      accent: "Origin",
    },
    {
      roman: "II",
      tag: "Divergence & World Physics",
      lead: "Branch four competing angles, then tune physical law.",
      body: "Compare four distinct structural takes on your premise. Then calibrate the world physics dials—strangeness, mundanity, explicit boundaries, and death stakes—to govern model behavior.",
      marginHandwriting: "“Friction creates gravity; gravity prevents slop.”",
      accent: "Axes",
    },
    {
      roman: "III",
      tag: "The Forge & Codex Refine",
      lead: "Stream full lore, test NPC gravity, and export cleanly.",
      body: "Watch synthesis ink stream across 15 codex sections. Audit five anti-gravity attractors in the Test Bench, roll 1d100 procedural tables, and export character cards directly for SillyTavern.",
      marginHandwriting: "“A finished manuscript is ready to run.”",
      accent: "Refine",
    },
  ];

  const currentPanel = panels[panelIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome note"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-ink-bleed select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--vellum-raised)] border-2 border-[var(--ink-soft)] rounded-[3px] shadow-2xl p-6 sm:p-8 overflow-hidden text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow:
            "0 20px 40px -15px rgba(35, 32, 27, 0.3), 0 0 0 1px var(--ink-soft)",
        }}
      >
        {/* Brass Paperclip Ornament on Top Edge */}
        <div className="absolute top-0 left-10 w-4 h-9 bg-gradient-to-b from-[var(--gold)] to-[#8C6D2E] rounded-b-full shadow-md border border-[var(--ink-soft)]/50 -translate-y-2 pointer-events-none" />

        {/* Close / Skip button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close note"
          className="absolute top-4 right-4 text-[var(--graphite)] hover:text-[var(--ink)] p-1 rounded transition-colors"
        >
          <X size={15} />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Feather size={14} className="text-[var(--rubric)]" />
            <span className="font-apparatus uppercase tracking-widest text-[10px] font-bold text-[var(--graphite)]">
              Scriptorium Field Note · Part {currentPanel.roman} of III
            </span>
          </div>
          <span className="font-mono-ui text-[10px] text-[var(--graphite)]">
            Panel {panelIndex + 1} / 3
          </span>
        </div>

        {/* Note Body */}
        <div className="space-y-4 mb-6">
          <h3 className="font-manuscript text-xl sm:text-2xl font-semibold text-[var(--ink)] leading-snug">
            {currentPanel.lead}
          </h3>

          <p className="font-manuscript text-sm text-[var(--graphite)] leading-relaxed">
            {currentPanel.body}
          </p>

          {/* Scribe's Marginal Note in Handwriting */}
          <div className="p-3 bg-[var(--vellum-deep)]/60 border-l-2 border-[var(--rubric)] rounded-r-[2px]">
            <p className="font-hand text-[var(--ink-blue)] text-lg leading-tight">
              {currentPanel.marginHandwriting}
            </p>
          </div>
        </div>

        {/* Step Indicator & Navigation Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--ink-soft)]">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-apparatus text-[var(--graphite)] hover:text-[var(--rubric)] transition-colors uppercase tracking-wider"
          >
            Skip Note
          </button>

          <div className="flex items-center gap-1.5">
            {panels.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPanelIndex(idx)}
                aria-label={`Go to panel ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === panelIndex
                    ? "w-5 bg-[var(--rubric)]"
                    : "w-1.5 bg-[var(--ink-soft)] hover:bg-[var(--graphite)]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {panelIndex > 0 && (
              <button
                type="button"
                onClick={() => setPanelIndex((p) => p - 1)}
                className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
              >
                <ArrowLeft size={11} />
                <span>Back</span>
              </button>
            )}

            {panelIndex < 2 ? (
              <button
                type="button"
                onClick={() => setPanelIndex((p) => p + 1)}
                className="btn-rubric text-[11px] py-1 px-3 flex items-center gap-1.5"
              >
                <span>Next</span>
                <ArrowRight size={11} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn-rubric text-[11px] py-1 px-3.5 flex items-center gap-1.5 bg-[var(--sage)] hover:opacity-90"
              >
                <Check size={12} />
                <span>Take Up Quill</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
