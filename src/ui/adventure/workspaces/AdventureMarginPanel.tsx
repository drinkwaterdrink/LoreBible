import React, { useState, useEffect } from "react";
import { SparkParse, CanonConfig, CanonFidelity } from "../../../types";
import { Plus, X, Anchor, BookMarked, Sliders, Check } from "lucide-react";

interface AdventureMarginPanelProps {
  parse?: SparkParse;
  onUpdateParse?: (updated: SparkParse) => void;
  canon: CanonConfig;
  onUpdateCanon: (updated: CanonConfig) => void;
  currentStage: number;
  onClose?: () => void;
}

type TabType = "context" | "canon" | "craft";

export const AdventureMarginPanel: React.FC<AdventureMarginPanelProps> = ({
  parse,
  onUpdateParse,
  canon,
  onUpdateCanon,
  currentStage: _currentStage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("context");
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
    onUpdateParse({
      ...parse,
      nonNegotiables: parse.nonNegotiables.filter((_, i) => i !== index),
    });
  };

  const handleAddNonNeg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNonNeg.trim() || !parse || !onUpdateParse) return;
    onUpdateParse({
      ...parse,
      nonNegotiables: [...parse.nonNegotiables, newNonNeg.trim()],
    });
    setNewNonNeg("");
    setIsAddingNonNeg(false);
  };

  const handleRemoveRegisterWord = (index: number) => {
    if (!parse || !onUpdateParse) return;
    onUpdateParse({
      ...parse,
      registerWords: parse.registerWords.filter((_, i) => i !== index),
    });
  };

  const handleAddRegisterWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegister.trim() || !parse || !onUpdateParse) return;
    onUpdateParse({
      ...parse,
      registerWords: [...parse.registerWords, newRegister.trim().toLowerCase()],
    });
    setNewRegister("");
    setIsAddingRegister(false);
  };

  const handleToggleCanon = () => {
    onUpdateCanon({
      ...canon,
      enabled: !canon.enabled,
    });
  };

  const handleFidelityChange = (fidelity: CanonFidelity) => {
    onUpdateCanon({
      ...canon,
      fidelity,
    });
  };

  return (
    <aside
      id="adventure-margin-panel"
      aria-label="Adventure Margin & World Context"
      className="w-full h-full flex flex-col bg-[var(--surface-sidebar)] border-l border-[var(--border-soft)] text-[var(--text-primary)]"
    >
      {/* Header */}
      <header className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Anchor size={15} className="text-[var(--accent-gold)]" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-[var(--text-primary)]">
            World Margin
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Margin Panel"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </header>

      {/* Tabs */}
      <nav aria-label="Margin Tabs" className="grid grid-cols-3 border-b border-[var(--border-soft)] bg-[var(--surface-app)] text-xs font-mono shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("context")}
          className={`py-2 text-center transition-colors cursor-pointer border-b-2 ${
            activeTab === "context"
              ? "border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold bg-[var(--surface-panel)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Context
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("canon")}
          className={`py-2 text-center transition-colors cursor-pointer border-b-2 ${
            activeTab === "canon"
              ? "border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold bg-[var(--surface-panel)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Canon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("craft")}
          className={`py-2 text-center transition-colors cursor-pointer border-b-2 ${
            activeTab === "craft"
              ? "border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold bg-[var(--surface-panel)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Craft
        </button>
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === "context" && (
          <>
            {/* Non-Negotiables / Fidelity Anchors */}
            <section aria-labelledby="anchors-heading" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 id="anchors-heading" className="text-xs font-mono text-[var(--accent-gold)] uppercase tracking-wider font-semibold">
                  Fidelity Anchors
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {parse?.nonNegotiables.length || 0} active
                </span>
              </div>
              <p className="text-[11px] font-manuscript text-[var(--text-secondary)] leading-relaxed">
                Core narrative axioms that subsequent generation must preserve without contradiction.
              </p>

              {parse?.nonNegotiables && parse.nonNegotiables.length > 0 ? (
                <ul className="space-y-2">
                  {parse.nonNegotiables.map((item, idx) => (
                    <li
                      key={idx}
                      className="group flex items-start justify-between gap-2 p-2.5 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-xs text-[var(--text-primary)] font-manuscript"
                    >
                      <span className="leading-snug">{item}</span>
                      {onUpdateParse && (
                        <button
                          type="button"
                          onClick={() => handleRemoveNonNeg(idx)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--status-danger)] transition-opacity shrink-0 cursor-pointer"
                          aria-label={`Remove anchor: ${item}`}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 rounded-[3px] bg-[var(--surface-panel)]/50 border border-dashed border-[var(--border-soft)] text-center text-xs text-[var(--text-muted)] font-manuscript">
                  No anchors defined yet. Click &quot;Analyze Margin&quot; on the editor or add manually.
                </div>
              )}

              {onUpdateParse && (
                isAddingNonNeg ? (
                  <form onSubmit={handleAddNonNeg} className="space-y-2">
                    <input
                      type="text"
                      value={newNonNeg}
                      onChange={(e) => setNewNonNeg(e.target.value)}
                      placeholder="e.g. Memory loss must remain irrevocable"
                      className="w-full px-2.5 py-1.5 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-gold)] text-xs text-[var(--text-primary)] outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingNonNeg(false)}
                        className="btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary text-[11px] py-1 px-2.5"
                      >
                        Add Anchor
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNonNeg(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[3px] border border-dashed border-[var(--border-soft)] hover:border-[var(--border-gold)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Manual Anchor</span>
                  </button>
                )
              )}
            </section>

            {/* Register / Voice Words */}
            <section aria-labelledby="register-heading" className="space-y-2.5 pt-4 border-t border-[var(--border-soft)]">
              <div className="flex items-center justify-between">
                <h3 id="register-heading" className="text-xs font-mono text-[var(--accent-gold)] uppercase tracking-wider font-semibold">
                  Register & Voice
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {parse?.registerWords.length || 0} words
                </span>
              </div>
              <p className="text-[11px] font-manuscript text-[var(--text-secondary)] leading-relaxed">
                Tonal touchstones and vocabulary that calibrate the linguistic atmospheric texture.
              </p>

              {parse?.registerWords && parse.registerWords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {parse.registerWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-xs font-mono text-[var(--text-primary)]"
                    >
                      <span>{word}</span>
                      {onUpdateParse && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRegisterWord(idx)}
                          className="text-[var(--text-muted)] hover:text-[var(--status-danger)] cursor-pointer"
                          aria-label={`Remove register word ${word}`}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] font-manuscript italic">
                  No register words extracted yet.
                </p>
              )}

              {onUpdateParse && (
                isAddingRegister ? (
                  <form onSubmit={handleAddRegisterWord} className="space-y-2">
                    <input
                      type="text"
                      value={newRegister}
                      onChange={(e) => setNewRegister(e.target.value)}
                      placeholder="e.g. rusted, brine, clockwork"
                      className="w-full px-2.5 py-1.5 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-gold)] text-xs text-[var(--text-primary)] outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingRegister(false)}
                        className="btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary text-[11px] py-1 px-2.5"
                      >
                        Add Word
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingRegister(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[3px] border border-dashed border-[var(--border-soft)] hover:border-[var(--border-gold)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Register Word</span>
                  </button>
                )
              )}
            </section>
          </>
        )}

        {activeTab === "canon" && (
          <section aria-labelledby="canon-settings-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="canon-settings-heading" className="text-xs font-mono text-[var(--accent-gold)] uppercase tracking-wider font-semibold">
                  Canon Enforcement
                </h3>
                <p className="text-[11px] font-manuscript text-[var(--text-secondary)] mt-0.5">
                  Govern how strictly Forge must adhere to established world lore.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleCanon}
                role="switch"
                aria-checked={canon.enabled}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  canon.enabled ? "bg-[var(--accent-gold)]" : "bg-[var(--surface-panel)]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    canon.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {canon.enabled && (
              <div className="space-y-3 pt-3 border-t border-[var(--border-soft)]">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
                    Franchise / Setting Source
                  </label>
                  <input
                    type="text"
                    value={canon.franchiseName || ""}
                    onChange={(e) => onUpdateCanon({ ...canon, franchiseName: e.target.value })}
                    placeholder="e.g. Star Wars, Dune, Pride & Prejudice"
                    className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Fidelity Policy
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["Strict", "Adjacent", "Riff"] as CanonFidelity[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleFidelityChange(mode)}
                        className={`py-1.5 text-xs font-mono uppercase rounded-[2px] border transition-colors cursor-pointer ${
                          canon.fidelity === mode
                            ? "bg-[var(--surface-panel)] border-[var(--border-gold)] text-[var(--accent-gold)] font-semibold"
                            : "bg-[var(--surface-panel)]/50 border-[var(--border-soft)] text-[var(--text-muted)]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1">
                    Directives & Overrides
                  </label>
                  <textarea
                    value={canon.explanation || ""}
                    onChange={(e) => onUpdateCanon({ ...canon, explanation: e.target.value })}
                    placeholder="Specific canon boundary rules for this world..."
                    className="w-full h-24 p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)] outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "craft" && (
          <section aria-labelledby="craft-heading" className="space-y-3">
            <h3 id="craft-heading" className="text-xs font-mono text-[var(--accent-gold)] uppercase tracking-wider font-semibold">
              Craft & Calibration
            </h3>
            <p className="text-[11px] font-manuscript text-[var(--text-secondary)]">
              Real-time calibration metrics for the current generation phase.
            </p>

            <div className="p-3 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] space-y-2 text-xs font-manuscript">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-mono">Stage:</span>
                <span className="text-[var(--text-primary)] font-semibold">Stage 01 · Origin Seed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-mono">Anchors:</span>
                <span className="text-[var(--text-primary)]">{parse?.nonNegotiables.length || 0} active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-mono">Canon:</span>
                <span className="text-[var(--text-primary)]">{canon.enabled ? `Active (${canon.fidelity})` : "Disabled"}</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
