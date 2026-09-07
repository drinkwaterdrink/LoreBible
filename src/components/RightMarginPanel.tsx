import React, { useState, useEffect } from "react";
import { SparkParse, CanonConfig, CanonFidelity } from "../types";
import { Plus, X, BookMarked, Feather } from "lucide-react";

interface RightMarginPanelProps {
  parse?: SparkParse;
  onUpdateParse?: (updated: SparkParse) => void;
  canon: CanonConfig;
  onUpdateCanon: (updated: CanonConfig) => void;
  currentStage: number;
  onClose?: () => void;
}

export const RightMarginPanel: React.FC<RightMarginPanelProps> = ({
  parse,
  onUpdateParse,
  canon,
  onUpdateCanon,
  currentStage: _currentStage,
  onClose,
}) => {
  const [newNonNeg, setNewNonNeg] = useState("");
  const [isAddingNonNeg, setIsAddingNonNeg] = useState(false);
  const [newRegister, setNewRegister] = useState("");
  const [isAddingRegister, setIsAddingRegister] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleRemoveNonNeg = (index: number) => {
    if (!parse || !onUpdateParse) return;
    const updated = {
      ...parse,
      nonNegotiables: parse.nonNegotiables.filter((_, i) => i !== index),
    };
    onUpdateParse(updated);
  };

  const handleAddNonNeg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNonNeg.trim() || !parse || !onUpdateParse) return;
    const updated = {
      ...parse,
      nonNegotiables: [...parse.nonNegotiables, newNonNeg.trim()],
    };
    onUpdateParse(updated);
    setNewNonNeg("");
    setIsAddingNonNeg(false);
  };

  const handleRemoveRegisterWord = (index: number) => {
    if (!parse || !onUpdateParse) return;
    const updated = {
      ...parse,
      registerWords: parse.registerWords.filter((_, i) => i !== index),
    };
    onUpdateParse(updated);
  };

  const handleAddRegisterWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegister.trim() || !parse || !onUpdateParse) return;
    const updated = {
      ...parse,
      registerWords: [...parse.registerWords, newRegister.trim().toLowerCase()],
    };
    onUpdateParse(updated);
    setNewRegister("");
    setIsAddingRegister(false);
  };

  const handleToggleCanon = () => {
    onUpdateCanon({
      ...canon,
      enabled: !canon.enabled,
    });
  };

  const handleSetFidelity = (fidelity: CanonFidelity) => {
    onUpdateCanon({
      ...canon,
      fidelity,
    });
  };

  return (
    <aside
      id="right-margin-panel"
      className="w-full h-full flex flex-col text-xs text-[var(--graphite)] select-none bg-[var(--vellum-deep)]/60 overflow-hidden"
    >
      {/* Marginal Apparatus Header (Sticky) */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--ink-soft)] bg-[var(--vellum-raised)] flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-1.5">
          <Feather size={13} className="text-[var(--rubric)]" />
          <span className="font-apparatus font-semibold text-[11px] uppercase tracking-widest text-[var(--ink)]">
            Margin Apparatus
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum)] rounded transition-colors cursor-pointer"
            title="Close margin panel (Esc)"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 space-y-6 pb-32 sm:pb-12 touch-pan-y">
        {/* CANON MODE MODULE */}
        <div
          id="canon-mode-card"
          className={`p-3 rounded-[2px] border transition-all ${
            canon.enabled
              ? "border-[var(--rubric)] bg-[var(--vellum-raised)] shadow-xs"
              : "border-[var(--ink-soft)] bg-transparent"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="canon-mode-toggle"
              className="font-apparatus font-semibold text-[11px] text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <BookMarked size={12} className={canon.enabled ? "text-[var(--rubric)]" : ""} />
              Canon Mode
            </label>
            <input
              id="canon-mode-toggle"
              type="checkbox"
              checked={canon.enabled}
              onChange={handleToggleCanon}
              className="cursor-pointer accent-[var(--rubric)]"
            />
          </div>

          <p className="text-[10px] leading-relaxed text-[var(--graphite)] mb-2">
            {canon.enabled
              ? "Source naming conventions active. Mundanity reinterpreted as setting logistics."
              : "Original world rules. Strict naming blocklist & single linguistic base enforced."}
          </p>

          {canon.enabled && (
            <div className="mt-2 pt-2 border-t border-[var(--ink-soft)] space-y-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-[var(--graphite)] mb-1">
                  Franchise
                </span>
                <input
                  id="canon-franchise-input"
                  type="text"
                  value={canon.franchiseName || ""}
                  onChange={(e) =>
                    onUpdateCanon({ ...canon, franchiseName: e.target.value })
                  }
                  placeholder="e.g. Star Wars, Pride & Prejudice, Dune"
                  className="w-full text-[11px] input-underline py-0.5"
                />
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider block text-[var(--graphite)] mb-1">
                  Canon Fidelity
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(["Strict", "Adjacent", "Riff"] as CanonFidelity[]).map((mode) => (
                    <button
                      key={mode}
                      id={`canon-fidelity-${mode.toLowerCase()}`}
                      type="button"
                      onClick={() => handleSetFidelity(mode)}
                      className={`py-1 text-[9px] uppercase tracking-wider font-apparatus border rounded-[2px] transition-colors ${
                        canon.fidelity === mode
                          ? "border-[var(--rubric)] text-[var(--rubric)] font-semibold bg-[var(--vellum)]"
                          : "border-[var(--ink-soft)] text-[var(--graphite)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SPARK FIDELITY PARSE */}
        {parse && (
          <div id="spark-parse-section" className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-apparatus font-semibold text-[10px] uppercase tracking-wider text-[var(--ink)]">
                  Locked Non-Negotiables
                </span>
                <button
                  id="add-non-negotiable-btn"
                  type="button"
                  onClick={() => setIsAddingNonNeg(!isAddingNonNeg)}
                  className="text-[10px] text-[var(--rubric)] hover:opacity-80 p-0.5"
                  title="Add non-negotiable anchor"
                >
                  <Plus size={13} />
                </button>
              </div>
              <p className="text-[9px] text-[var(--graphite)] mb-2 italic">
                Concrete nouns the app must retain in every angle.
              </p>

              <ul className="space-y-1">
                {parse.nonNegotiables.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between py-1 px-2 border border-[var(--ink-soft)] rounded-[2px] bg-[var(--vellum)] text-[10px] text-[var(--ink)] font-manuscript"
                  >
                    <span className="truncate pr-1">“{item}”</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNonNeg(index)}
                      className="text-[var(--graphite)] hover:text-[var(--rubric)] shrink-0 p-0.5"
                      title="Remove from non-negotiables"
                    >
                      <X size={11} />
                    </button>
                  </li>
                ))}
                {parse.nonNegotiables.length === 0 && (
                  <li className="text-[10px] italic text-[var(--graphite)] py-1">
                    None locked. Spark will be interpreted broadly.
                  </li>
                )}
              </ul>

              {isAddingNonNeg && (
                <form onSubmit={handleAddNonNeg} className="mt-2 flex gap-1">
                  <input
                    type="text"
                    value={newNonNeg}
                    onChange={(e) => setNewNonNeg(e.target.value)}
                    placeholder="e.g. herbalist guild, deep-orbit station"
                    className="input-underline text-[10px] w-full py-0.5"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn-primary text-[9px] px-2 py-0.5 shrink-0"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>

            {/* REGISTER & ENERGY WORDS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-apparatus font-semibold text-[10px] uppercase tracking-wider text-[var(--ink)]">
                  Register & Energy Words
                </span>
                <button
                  id="add-register-word-btn"
                  type="button"
                  onClick={() => setIsAddingRegister(!isAddingRegister)}
                  className="text-[10px] text-[var(--sage)] hover:opacity-80 p-0.5"
                  title="Add register word"
                >
                  <Plus size={13} />
                </button>
              </div>
              <p className="text-[9px] text-[var(--graphite)] mb-2 italic">
                Atmospheric anchors dictating pacing, tension, and prose style.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parse.registerWords.map((word, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] text-[var(--sage)] bg-[var(--vellum)] px-2 py-0.5 border border-[var(--ink-soft)] rounded-[2px] font-apparatus lowercase tracking-wide"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRegisterWord(i)}
                      className="text-[var(--graphite)] hover:text-[var(--rubric)] cursor-pointer"
                      title={`Remove ${word}`}
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
                {parse.registerWords.length === 0 && (
                  <span className="text-[10px] italic text-[var(--graphite)]">
                    No register words set.
                  </span>
                )}
              </div>

              {isAddingRegister && (
                <form onSubmit={handleAddRegisterWord} className="mt-2 flex gap-1">
                  <input
                    type="text"
                    value={newRegister}
                    onChange={(e) => setNewRegister(e.target.value)}
                    placeholder="e.g. visceral, claustrophobic"
                    className="input-underline text-[10px] w-full py-0.5"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn-primary text-[9px] px-2 py-0.5 shrink-0"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>

            {/* USER ROLE */}
            {parse.userRole && (
              <div>
                <span className="font-apparatus font-semibold text-[10px] uppercase tracking-wider text-[var(--ink)] block mb-0.5">
                  Starting Role
                </span>
                <span className="text-[11px] text-[var(--ink)] font-manuscript italic block bg-[var(--vellum)]/60 px-2 py-1 border border-[var(--ink-soft)] rounded-[2px]">
                  {parse.userRole}
                </span>
              </div>
            )}

            {/* OPEN NEGOTIABLES */}
            {parse.openNegotiables && parse.openNegotiables.length > 0 && (
              <div>
                <span className="font-apparatus font-semibold text-[10px] uppercase tracking-wider text-[var(--ink)] block mb-1">
                  Open Speculative Space
                </span>
                <ul className="space-y-1.5 text-[10px] text-[var(--graphite)] font-manuscript list-disc pl-3">
                  {parse.openNegotiables.map((item, idx) => (
                    <li key={idx} className="leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Scribe Guidance note */}
        <div className="pt-4 border-t border-[var(--ink-soft)] text-[10px] leading-relaxed text-[var(--graphite)]">
          <p className="font-hand text-base text-[var(--ink-blue)] leading-snug">
            “Define the physics, not the trajectory. What is already in motion proceeds regardless.”
          </p>
        </div>
      </div>
    </aside>
  );
};
