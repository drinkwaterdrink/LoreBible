import React, { useRef, useEffect, useState } from "react";
import { rollCollision, generateNovelSparks, NovelSpark } from "../lib/wordBanks";
import { Dices, ArrowRight, RotateCcw, Feather, Sparkles, HelpCircle, Check, BookOpen, Sliders, ChevronDown, ChevronUp } from "lucide-react";
import { GenerationSettings, AuthorId, DivergenceMode, GenerationQuality, AuthorFlavorStrength } from "../types";
import { AUTHOR_PROFILES } from "../lib/authorProfiles";

interface SparkStageProps {
  sparkText: string;
  onChangeSpark: (text: string) => void;
  onProceed: () => void;
  isLoading: boolean;
  onAnalyzeMargin?: () => void;
  isParsingMargin?: boolean;
  hasParsedMargin?: boolean;
  onOpenMargin?: () => void;
  settings?: GenerationSettings;
  onUpdateSettings?: (settings: GenerationSettings) => void;
}

export const SparkStage: React.FC<SparkStageProps> = ({
  sparkText,
  onChangeSpark,
  onProceed,
  isLoading,
  onAnalyzeMargin,
  isParsingMargin = false,
  hasParsedMargin = false,
  onOpenMargin,
  settings,
  onUpdateSettings,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTumbling, setIsTumbling] = useState(false);
  const [showCollideExplainer, setShowCollideExplainer] = useState(false);
  const [showCraftSettings, setShowCraftSettings] = useState(false);
  const [novelSparks, setNovelSparks] = useState<NovelSpark[]>(() => generateNovelSparks(4));
  const [isRollingSparks, setIsRollingSparks] = useState(false);
  const [justInked, setJustInked] = useState(false);

  // Auto-grow textarea with bounded limits and preserve scrollability
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const targetHeight = Math.min(Math.max(140, el.scrollHeight), 440);
    el.style.height = `${targetHeight}px`;
  }, [sparkText]);

  const handleCollide = () => {
    setIsTumbling(true);
    const rolled = rollCollision();
    onChangeSpark(rolled.combined);
    setTimeout(() => setIsTumbling(false), 500);
  };

  const handleRollFreshSparks = () => {
    setIsRollingSparks(true);
    setTimeout(() => {
      setNovelSparks(generateNovelSparks(4));
      setIsRollingSparks(false);
    }, 280);
  };

  const handleSelectExample = (premise: string) => {
    onChangeSpark(premise);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClear = () => {
    onChangeSpark("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTriggerMarginInking = () => {
    if (onAnalyzeMargin) {
      onAnalyzeMargin();
      setJustInked(true);
      setTimeout(() => setJustInked(false), 3000);
    }
  };

  const wordCount = sparkText.trim() ? sparkText.trim().split(/\s+/).length : 0;
  const isLongInput = sparkText.length > 250;

  return (
    <div id="spark-stage-container" className="w-full max-w-[78ch] mx-auto py-6 sm:py-8">
      {/* Scribe Header Cluster */}
      <div className="mb-6">
        <span className="text-[11px] font-apparatus font-semibold uppercase tracking-widest text-[var(--graphite)]">
          Stage 01 · Origin Seed
        </span>
        <h2 className="text-2xl font-manuscript font-normal text-[var(--ink)] mt-1">
          Lay down the spark.
        </h2>
        <p className="text-xs text-[var(--graphite)] mt-1.5 font-manuscript leading-relaxed max-w-[65ch]">
          A premise, a vibe, a mashup, or a roleplay scenario. Write freely in the Author&apos;s Hand, then click <strong className="text-[var(--ink)]">Ink &amp; Analyze Margin</strong> to distill anchors without losing your custom edits.
        </p>
      </div>

      {/* Sheet card for Spark Input */}
      <div className="manuscript-sheet p-5 sm:p-6 mb-6 relative">
        <div className="flex items-center justify-between mb-3 border-b border-[var(--ink-soft)] pb-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="spark-textarea"
              className="text-[10px] uppercase tracking-wider text-[var(--graphite)] font-apparatus font-semibold flex items-center gap-1.5"
            >
              <Feather size={12} className="text-[var(--rubric)]" />
              <span>Author&apos;s Hand</span>
            </label>
            {isLongInput && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--ink-soft)] text-[var(--graphite)] font-mono-ui">
                Extended Input
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {sparkText.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-[var(--graphite)] hover:text-[var(--rubric)] transition-colors flex items-center gap-1 font-apparatus px-1.5 py-0.5"
                title="Clear input"
              >
                <RotateCcw size={11} />
                <span>Clear</span>
              </button>
            )}

            {/* Collide button with Explainer Toggle */}
            <div className="relative flex items-center gap-1">
              <button
                id="spark-collide-btn"
                type="button"
                onClick={handleCollide}
                className={`btn-secondary flex items-center gap-1.5 ${
                  isTumbling ? "animate-dice-tumble" : ""
                }`}
                title="Roll 3 contrasting elements: object/place + emotional register + structural constraint"
              >
                <Dices size={13} className="text-[var(--rubric)]" />
                <span>Collide</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCollideExplainer(!showCollideExplainer)}
                className="p-1 text-[var(--graphite)] hover:text-[var(--ink)] transition-colors rounded"
                title="What does Collide do?"
              >
                <HelpCircle size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Explainer tooltip for Collide if opened */}
        {showCollideExplainer && (
          <div className="mb-3 p-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded text-xs font-manuscript text-[var(--ink)] flex items-start justify-between gap-3 animate-fade-in">
            <div>
              <span className="font-semibold text-[var(--rubric)] font-apparatus uppercase text-[10px] block mb-1">
                The Collide Engine
              </span>
              <p className="text-[11px] leading-relaxed text-[var(--graphite)]">
                <strong>Collide</strong> smashes together three divergent concept anchors: an <em>object or evocative place</em>, an <em>unexpected emotional register</em>, and a <em>high-stakes structural constraint</em>. This creates an immediate, sharp scenario hook that breaks writer&apos;s block.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCollideExplainer(false)}
              className="text-[10px] text-[var(--graphite)] hover:text-[var(--ink)] shrink-0 px-1 border border-[var(--ink-soft)] rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* The Handwritten Spark Input */}
        <textarea
          id="spark-textarea"
          ref={textareaRef}
          value={sparkText}
          onChange={(e) => onChangeSpark(e.target.value)}
          placeholder="Write your premise here... (e.g. Victorian apothecary dealing in illicit sensory memories, small-town baker receiving daily anonymous blackmail notes, deep-space salvage crew encountering an impossible broadcast, or royal bodyguard bound by a blood debt)"
          className="w-full bg-transparent resize-y min-h-[140px] max-h-[440px] overflow-y-auto outline-none font-hand text-xl text-[var(--ink-blue)] leading-relaxed border-none focus:ring-0 placeholder:text-[var(--graphite)]/50 placeholder:font-hand placeholder:text-lg"
          rows={4}
          autoFocus
        />

        <div className="mt-3 pt-2.5 border-t border-[var(--ink-soft)] flex items-center justify-between text-[10px] text-[var(--graphite)]">
          <span className="italic font-manuscript">
            Printed ink is the machine. Handwriting is yours.
          </span>
          <span className="font-mono-ui">
            {wordCount} words · {sparkText.length.toLocaleString()} chars
          </span>
        </div>

        {/* CRAFT CALIBRATION & AUTHOR FLAVOR (TOGGLEABLE) */}
        {settings && onUpdateSettings && (
          <div className="mt-3 pt-3 border-t border-[var(--ink-soft)]/60">
            <button
              type="button"
              onClick={() => setShowCraftSettings(!showCraftSettings)}
              className="flex items-center justify-between w-full text-left text-[11px] font-apparatus font-semibold uppercase tracking-wider text-[var(--graphite)] hover:text-[var(--ink)] transition-colors py-1"
            >
              <div className="flex items-center gap-2">
                <Sliders size={12} className="text-[var(--gold)]" />
                <span>Creative Engine Calibration &amp; Author Flavor</span>
                <span className="text-[9px] font-mono-ui normal-case text-[var(--gold)] bg-[var(--gold)]/10 px-1.5 py-0.2 rounded">
                  {settings.quality} · {settings.divergenceMode}
                  {settings.authorFlavor.mode !== "Off" && ` · ${settings.authorFlavor.manualAuthorId ? AUTHOR_PROFILES[settings.authorFlavor.manualAuthorId]?.name || "Author" : "Auto Flavor"}`}
                </span>
              </div>
              {showCraftSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showCraftSettings && (
              <div className="mt-2.5 p-3 rounded-[3px] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] space-y-3 animate-fade-in text-xs font-manuscript">
                {/* Generation Quality */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--ink-soft)] pb-2.5">
                  <div>
                    <span className="font-apparatus uppercase tracking-wider text-[10px] font-semibold text-[var(--ink)] block">
                      Pipeline Quality
                    </span>
                    <span className="text-[10px] text-[var(--graphite)]">
                      {settings.quality === "Deep Craft"
                        ? "3-stage Architect → Critic → Writer pipeline with High thinking. Max angle variance."
                        : settings.quality === "Balanced"
                        ? "Standard balanced inference with medium thinking."
                        : "Fast lightweight drafting."}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(["Fast", "Balanced", "Deep Craft"] as GenerationQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, quality: q })}
                        className={`text-[10px] font-apparatus px-2 py-0.8 rounded border transition-all ${
                          settings.quality === q
                            ? "bg-[var(--rubric)] text-white border-[var(--rubric)] font-bold shadow-xs"
                            : "bg-[var(--vellum)] text-[var(--graphite)] border-[var(--ink-soft)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divergence Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--ink-soft)] pb-2.5">
                  <div>
                    <span className="font-apparatus uppercase tracking-wider text-[10px] font-semibold text-[var(--ink)] block">
                      Possibility Spread Mode
                    </span>
                    <span className="text-[10px] text-[var(--graphite)]">
                      {settings.divergenceMode === "Exploratory"
                        ? "Orthogonal discovery across psychological, systemic, strange, and structural axes."
                        : settings.divergenceMode === "Faithful"
                        ? "Anchors tightly to premise without radical departures."
                        : settings.divergenceMode === "Radical"
                        ? "Pushes maximal tension and contrast between each angle."
                        : "Wildcard adjacent collisions and unexpected subgenres."}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(["Faithful", "Exploratory", "Radical", "Unbound"] as DivergenceMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, divergenceMode: m })}
                        className={`text-[10px] font-apparatus px-2 py-0.8 rounded border transition-all ${
                          settings.divergenceMode === m
                            ? "bg-[var(--gold)] text-black border-[var(--gold)] font-bold shadow-xs"
                            : "bg-[var(--vellum)] text-[var(--graphite)] border-[var(--ink-soft)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Author Flavor */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-apparatus uppercase tracking-wider text-[10px] font-semibold text-[var(--ink)] block">
                        Optional Author Flavor Overlay
                      </span>
                      <span className="text-[10px] text-[var(--graphite)]">
                        Lends literary cadence, dialogue habits, and craft worldview without copying content.
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(["Off", "Auto", "Manual"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              authorFlavor: {
                                ...settings.authorFlavor,
                                mode,
                              },
                            })
                          }
                          className={`text-[10px] font-apparatus px-2 py-0.8 rounded border transition-all ${
                            settings.authorFlavor.mode === mode
                              ? "bg-[var(--ink-blue)] text-white border-[var(--ink-blue)] font-bold"
                              : "bg-[var(--vellum)] text-[var(--graphite)] border-[var(--ink-soft)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {mode === "Off" ? "None" : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {settings.authorFlavor.mode === "Manual" && (
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <select
                        value={settings.authorFlavor.manualAuthorId || ""}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            authorFlavor: {
                              ...settings.authorFlavor,
                              manualAuthorId: (e.target.value as AuthorId) || null,
                            },
                          })
                        }
                        className="text-xs font-apparatus bg-[var(--vellum)] border border-[var(--ink-soft)] rounded px-2 py-1 text-[var(--ink)] outline-none"
                      >
                        <option value="">Select Author Voice…</option>
                        {Object.values(AUTHOR_PROFILES).map((prof) => (
                          <option key={prof.id} value={prof.id}>
                            {prof.name} — {prof.subtitle}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--graphite)] font-apparatus">Strength:</span>
                        {(["Sprinkle", "Strong", "Overdrive"] as AuthorFlavorStrength[]).map((str) => (
                          <button
                            key={str}
                            type="button"
                            onClick={() =>
                              onUpdateSettings({
                                ...settings,
                                authorFlavor: {
                                  ...settings.authorFlavor,
                                  strength: str,
                                },
                              })
                            }
                            className={`text-[9px] font-apparatus px-1.5 py-0.5 rounded border transition-all ${
                              settings.authorFlavor.strength === str
                                ? "bg-[var(--ink)] text-[var(--vellum)] border-[var(--ink)] font-bold"
                                : "bg-[var(--vellum)] text-[var(--graphite)] border-[var(--ink-soft)]"
                            }`}
                          >
                            {str}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEDICATED MARGIN APPARATUS INKING SECTION */}
        <div className="mt-4 pt-3 border-t border-dashed border-[var(--ink-soft)] bg-[var(--vellum-raised)]/60 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3 rounded-b-[3px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-apparatus font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <span>Margin Apparatus Controls</span>
              {hasParsedMargin && (
                <span className="text-[9px] font-mono-ui px-1.5 py-0.2 rounded bg-[var(--gold)]/20 text-[var(--gold)] font-bold">
                  Inked &amp; Active
                </span>
              )}
            </span>
            <p className="text-[11px] text-[var(--graphite)] font-manuscript mt-0.5">
              Press when finished writing. Extracts anchors without reverting your manual margin edits.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenMargin && (
              <button
                type="button"
                onClick={onOpenMargin}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-apparatus"
                title="Inspect or edit margin apparatus"
              >
                <BookOpen size={13} className="text-[var(--graphite)]" />
                <span>Open Margin</span>
              </button>
            )}

            <button
              id="ink-margin-apparatus-btn"
              type="button"
              disabled={!sparkText.trim() || isParsingMargin}
              onClick={handleTriggerMarginInking}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-2 font-apparatus disabled:opacity-50 disabled:cursor-not-allowed"
              title="Analyze premise and extract non-negotiable anchors and tone into the margin apparatus"
            >
              {isParsingMargin ? (
                <>
                  <Sparkles size={13} className="animate-spin text-[var(--gold)]" />
                  <span>Inking Margin…</span>
                </>
              ) : justInked ? (
                <>
                  <Check size={13} className="text-green-400" />
                  <span>Margin Inked!</span>
                </>
              ) : hasParsedMargin ? (
                <>
                  <Feather size={13} className="text-[var(--rubric)]" />
                  <span>Re-analyze Margin</span>
                </>
              ) : (
                <>
                  <Feather size={13} className="text-[var(--rubric)]" />
                  <span>Ink &amp; Analyze Margin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC TESTED SPARKS SECTION */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 border-b border-[var(--ink-soft)] pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink)] font-apparatus font-semibold">
              Tested Sparks &amp; Novel Archetypes
            </span>
            <span className="text-[9px] text-[var(--graphite)] font-mono-ui">
              (Anime, Gothic Lit, Sci-Fi, History, AI RP)
            </span>
          </div>

          <button
            id="roll-fresh-sparks-btn"
            type="button"
            onClick={handleRollFreshSparks}
            className="text-xs font-apparatus text-[var(--gold)] hover:text-[var(--ink)] transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--ink-soft)] hover:border-[var(--gold)] bg-[var(--vellum-raised)]"
            title="Generate completely new sparks from wide inspirations"
          >
            <Sparkles size={12} className={isRollingSparks ? "animate-spin text-[var(--rubric)]" : ""} />
            <span>Roll Fresh Sparks</span>
          </button>
        </div>

        {/* 2x2 Grid of Rich Novel Sparks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {novelSparks.map((spark) => (
            <div
              key={spark.id}
              onClick={() => handleSelectExample(spark.premise)}
              className="p-3.5 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum)] hover:bg-[var(--vellum-raised)] hover:border-[var(--graphite)] transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[9px] font-mono-ui uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--ink-soft)] text-[var(--ink)] group-hover:bg-[var(--rubric)]/20 group-hover:text-[var(--rubric)] transition-colors">
                    {spark.category}
                  </span>
                  <span className="text-[9px] font-apparatus text-[var(--graphite)] italic">
                    {spark.sourceInspiration}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-[var(--ink)] font-apparatus mb-1">
                  {spark.title}
                </h4>
                <p className="text-xs text-[var(--graphite)] font-manuscript leading-relaxed line-clamp-3 group-hover:text-[var(--ink)] transition-colors">
                  “{spark.premise}”
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[var(--ink-soft)]/50 flex items-center justify-between text-[10px] text-[var(--graphite)]">
                <span className="font-hand text-xs text-[var(--ink-blue)] group-hover:underline">
                  Click to ink this premise →
                </span>
                <span className="font-mono-ui text-[9px] opacity-60">tap to use</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--ink-soft)] sticky bottom-0 bg-[var(--vellum)]/95 backdrop-blur-xs py-3 z-10">
        <span className="text-xs text-[var(--graphite)] font-manuscript">
          Ready to extract fidelity anchors and forge 4 divergence angles.
        </span>
        <button
          id="proceed-to-divergence-btn"
          type="button"
          disabled={!sparkText.trim() || isLoading}
          onClick={onProceed}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs py-2 px-4 shadow-sm"
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-pulse">Scribing anchors…</span>
            </>
          ) : (
            <>
              <span>Examine Divergence</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
