import React, { useState } from "react";
import {
  Sparkles,
  Compass,
  ArrowRight,
  Check,
  RotateCcw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { StageHero } from "../components/StageHero";
import { StageToolDock, ToolDockAction } from "../components/StageToolDock";
import { MobileStageSheet } from "../components/MobileStageSheet";
import type { DivergenceTake, GenerationSettings } from "../../../types";
import type { GenerationActivityProps } from "../../../components/GenerationActivity";

interface AdventureDivergenceWorkspaceProps {
  takes: DivergenceTake[];
  selectedTakeId?: string;
  onSelectTake: (take: DivergenceTake) => void;
  onRerollAll: () => void;
  onPushFurther: (take: DivergenceTake, pushInstruction: string) => void;
  onRerollSingleTake?: (take: DivergenceTake) => Promise<void> | void;
  onCancelSingleTake?: () => void;
  onSteerSingleTake?: (take: DivergenceTake, steerInstruction: string) => Promise<void> | void;
  onUpdateTake?: (updatedTake: DivergenceTake) => void;
  onSwitchTakeVersion?: (takeSlotId: string, versionIndex: number) => void;
  rerollingSingleId?: string | null;
  onProceed: () => void;
  isLoading: boolean;
  sparkText: string;
  divergenceError?: string | null;
  onRetry?: () => void;
  onOpenConnections?: () => void;
  settings?: GenerationSettings;
  onUpdateSettings?: (settings: GenerationSettings) => void;
  generationActivity?: GenerationActivityProps;
  boardIndex?: number;
  boardCount?: number;
  onSwitchBoard?: (index: number) => void;
  workingTitle?: string;
  isSaved?: boolean;
}

const STEER_SUGGESTIONS = [
  "More intimate & character-driven",
  "Heighten suspense & ticking clock",
  "Deepen personal relationships & stakes",
  "Accentuate strange or uncanny rules",
  "Focus on social friction & hidden motives",
  "Lighter, warmer, or more comedic tone",
  "Darker psychological undercurrent",
];

export const AdventureDivergenceWorkspace: React.FC<AdventureDivergenceWorkspaceProps> = ({
  takes,
  selectedTakeId,
  onSelectTake,
  onRerollAll,
  onPushFurther,
  onRerollSingleTake,
  onSteerSingleTake,
  onSwitchTakeVersion,
  rerollingSingleId,
  onProceed,
  isLoading,
  sparkText: _sparkText,
  divergenceError,
  onRetry,
  boardIndex = 0,
  boardCount = 1,
  onSwitchBoard,
  workingTitle,
  isSaved = false,
}) => {
  // Mobile active card index (0 to 3)
  const [mobileCardIndex, setMobileCardIndex] = useState(0);

  // Steer drawer state
  const [steerTake, setSteerTake] = useState<DivergenceTake | null>(null);
  const [steerText, setSteerText] = useState("");
  const [isSubmittingSteer, setIsSubmittingSteer] = useState(false);

  // Push further drawer state
  const [pushTake, setPushTake] = useState<DivergenceTake | null>(null);
  const [pushText, setPushText] = useState("");

  const selectedTake = takes.find((t) => t.id === selectedTakeId) || takes[0];

  const handleOpenSteer = (take: DivergenceTake) => {
    setSteerTake(take);
    setSteerText("");
  };

  const handleExecuteSteer = async () => {
    if (!steerTake || !onSteerSingleTake || !steerText.trim()) return;
    setIsSubmittingSteer(true);
    try {
      await onSteerSingleTake(steerTake, steerText.trim());
      setSteerTake(null);
    } finally {
      setIsSubmittingSteer(false);
    }
  };

  const handleExecutePush = (take: DivergenceTake) => {
    const instruction = pushText.trim() || "Deepen the stakes and sharpen the core conflict.";
    onPushFurther(take, instruction);
    setPushTake(null);
    setPushText("");
  };

  const secondaryActions: ToolDockAction[] = [
    {
      id: "reroll-all",
      label: "Reroll All Angles",
      icon: <RotateCcw size={14} />,
      onClick: onRerollAll,
      disabled: isLoading,
      loading: isLoading,
      title: "Generate four completely new narrative angles",
    },
    ...(selectedTake
      ? [
          {
            id: "push-selected",
            label: "Push Selected Further",
            icon: <Sparkles size={14} className="text-[var(--accent-gold)]" />,
            onClick: () => {
              setPushTake(selectedTake);
              setPushText("");
            },
            disabled: isLoading,
            title: `Intensify and push "${selectedTake.title}" further`,
          },
        ]
      : []),
    ...(boardCount > 1 && onSwitchBoard
      ? [
          {
            id: "switch-board",
            label: `Board ${boardIndex + 1} of ${boardCount}`,
            icon: <Compass size={14} />,
            onClick: () => onSwitchBoard((boardIndex + 1) % boardCount),
            title: "Switch to next generated divergence board",
          },
        ]
      : []),
  ];

  const primaryAction: ToolDockAction = {
    id: "proceed-blueprint",
    label: "Open Blueprint",
    icon: <ArrowRight size={15} />,
    onClick: onProceed,
    disabled: !selectedTakeId || isLoading,
    title: selectedTake ? `Lock "${selectedTake.title}" and plan Blueprint` : "Select a path to proceed",
  };

  return (
    <div id="adventure-divergence-workspace" className="w-full flex flex-col min-h-0 space-y-6">
      {/* Stage Header */}
      <StageHero
        stageNumber={2}
        stageName="Divergence"
        stageSubtitle="Four Angles"
        title="Explore the four paths."
        description="Four distinctive creative trajectories distilled from your seed. Choose the path that demands to be written, steer an individual angle, or push it further."
        workingTitle={workingTitle}
        isSaved={isSaved}
      />

      {/* Error Notice */}
      {divergenceError && (
        <div
          role="alert"
          className="p-4 rounded-[4px] bg-[var(--surface-panel)] border border-[var(--status-danger)] flex items-start justify-between gap-3 text-xs text-[var(--text-primary)] font-manuscript"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--status-danger)] shrink-0" />
            <span>{divergenceError}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-secondary text-[11px] py-1 px-2.5 shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Desktop View: 4-Quadrant Exploration Board */}
      <div className="hidden md:grid grid-cols-2 gap-4 w-full max-w-5xl mx-auto">
        {takes.map((take, index) => {
          const isSelected = take.id === selectedTakeId;
          const isRerolling = rerollingSingleId === take.id;
          const hasVersions = take.versions && take.versions.length > 1;

          return (
            <article
              key={take.id}
              onClick={() => onSelectTake(take)}
              className={`adventure-card p-5 flex flex-col justify-between cursor-pointer transition-all ${
                isSelected ? "adventure-card-selected" : "hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="space-y-3">
                {/* Angle Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
                      Path {index + 1} {take.genreTone ? `· ${take.genreTone}` : ""}
                    </span>
                    <h2 className="text-base sm:text-lg font-serif-title font-semibold text-[var(--text-primary)] leading-snug">
                      {take.title}
                    </h2>
                  </div>

                  {isSelected && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--accent-gold)] text-[var(--surface-sidebar)] text-[10px] font-mono font-bold uppercase tracking-wider">
                      <Check size={12} strokeWidth={3} /> Chosen
                    </span>
                  )}
                </div>

                {/* Pitch */}
                <p className="text-xs sm:text-sm font-manuscript text-[var(--text-secondary)] leading-relaxed line-clamp-4">
                  {take.pitch}
                </p>

                {/* What's Strange / Speculative Core */}
                {take.whatsStrange && (
                  <div className="p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)]">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-gold)] block mb-0.5">
                      The Strange Element
                    </span>
                    <p className="leading-snug">{take.whatsStrange}</p>
                  </div>
                )}
              </div>

              {/* Angle Action Bar */}
              <div
                className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  {onSteerSingleTake && (
                    <button
                      type="button"
                      onClick={() => handleOpenSteer(take)}
                      disabled={isLoading || isRerolling}
                      className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel-raised)] transition-colors cursor-pointer"
                      title="Steer this angle with custom guidance"
                    >
                      <Sliders size={12} className="inline mr-1" /> Steer
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPushTake(take);
                      setPushText("");
                    }}
                    disabled={isLoading || isRerolling}
                    className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel-raised)] transition-colors cursor-pointer"
                    title="Push this premise angle further"
                  >
                    <Sparkles size={12} className="inline mr-1 text-[var(--accent-gold)]" /> Push
                  </button>

                  {onRerollSingleTake && (
                    <button
                      type="button"
                      onClick={() => onRerollSingleTake(take)}
                      disabled={isLoading || isRerolling}
                      className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel-raised)] transition-colors cursor-pointer"
                      title="Reroll only this angle"
                    >
                      {isRerolling ? (
                        <Loader2 size={12} className="inline mr-1 animate-spin" />
                      ) : (
                        <RotateCcw size={12} className="inline mr-1" />
                      )}
                      Reroll
                    </button>
                  )}
                </div>

                {/* Version switcher */}
                {hasVersions && onSwitchTakeVersion && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)]">
                    <History size={11} />
                    {take.versions!.map((v, vIdx) => (
                      <button
                        key={vIdx}
                        type="button"
                        onClick={() => onSwitchTakeVersion(take.id, vIdx)}
                        className={`px-1 rounded ${
                          v.pitch === take.pitch
                            ? "bg-[var(--accent-gold)] text-[var(--surface-sidebar)] font-bold"
                            : "hover:text-[var(--text-primary)]"
                        }`}
                      >
                        v{vIdx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Mobile View: 1-Card Snap Carousel */}
      <div className="md:hidden flex flex-col items-center w-full space-y-4">
        {takes.length > 0 && takes[mobileCardIndex] && (() => {
          const currentTake = takes[mobileCardIndex];
          const isSelected = currentTake.id === selectedTakeId;
          const isRerolling = rerollingSingleId === currentTake.id;

          return (
            <div className="w-full space-y-3">
              {/* Step indicator */}
              <div className="flex items-center justify-between px-1 text-xs font-mono text-[var(--text-secondary)]">
                <span>
                  Path {mobileCardIndex + 1} of {takes.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMobileCardIndex((prev) => Math.max(0, prev - 1))}
                    disabled={mobileCardIndex === 0}
                    className="p-1 rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] disabled:opacity-30 cursor-pointer"
                    aria-label="Previous path"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileCardIndex((prev) => Math.min(takes.length - 1, prev + 1))}
                    disabled={mobileCardIndex === takes.length - 1}
                    className="p-1 rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] disabled:opacity-30 cursor-pointer"
                    aria-label="Next path"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Active Mobile Card */}
              <article
                className={`adventure-card p-5 space-y-3.5 transition-all ${
                  isSelected ? "adventure-card-selected" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
                      {currentTake.genreTone || `Angle ${mobileCardIndex + 1}`}
                    </span>
                    <h2 className="text-lg font-serif-title font-semibold text-[var(--text-primary)]">
                      {currentTake.title}
                    </h2>
                  </div>
                  {isSelected && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--accent-gold)] text-[var(--surface-sidebar)] text-[10px] font-mono font-bold uppercase">
                      <Check size={12} strokeWidth={3} /> Chosen
                    </span>
                  )}
                </div>

                <p className="text-xs font-manuscript text-[var(--text-secondary)] leading-relaxed">
                  {currentTake.pitch}
                </p>

                {currentTake.whatsStrange && (
                  <div className="p-2.5 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)]">
                    <span className="font-mono text-[10px] uppercase text-[var(--accent-gold)] block mb-0.5">
                      The Strange Element
                    </span>
                    <p className="leading-snug">{currentTake.whatsStrange}</p>
                  </div>
                )}

                {/* Mobile Choose Path CTA */}
                <button
                  type="button"
                  onClick={() => onSelectTake(currentTake)}
                  className={`w-full py-2 px-3 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent-gold)] text-[var(--surface-sidebar)] shadow-md"
                      : "bg-[var(--surface-panel-raised)] border border-[var(--border-gold)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                  }`}
                >
                  {isSelected ? "✓ Chosen Path" : "Choose This Path"}
                </button>

                {/* Secondary card tools */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)] text-xs font-mono">
                  {onSteerSingleTake && (
                    <button
                      type="button"
                      onClick={() => handleOpenSteer(currentTake)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Sliders size={12} className="inline mr-1" /> Steer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPushTake(currentTake);
                      setPushText("");
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Sparkles size={12} className="inline mr-1 text-[var(--accent-gold)]" /> Push
                  </button>
                  {onRerollSingleTake && (
                    <button
                      type="button"
                      onClick={() => onRerollSingleTake(currentTake)}
                      disabled={isRerolling}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      {isRerolling ? <Loader2 size={12} className="inline animate-spin mr-1" /> : <RotateCcw size={12} className="inline mr-1" />}
                      Reroll
                    </button>
                  )}
                </div>
              </article>
            </div>
          );
        })()}
      </div>

      {/* Shared Stage Tool Dock */}
      <div className="w-full max-w-5xl mx-auto pt-2">
        <StageToolDock
          secondaryActions={secondaryActions}
          primaryAction={primaryAction}
          statusMessage={
            selectedTake ? `Selected: "${selectedTake.title}"` : "Choose one path to advance"
          }
        />
      </div>

      {/* Steer Single Angle Drawer */}
      <MobileStageSheet
        isOpen={Boolean(steerTake)}
        onClose={() => setSteerTake(null)}
        title={steerTake ? `Steer Angle: ${steerTake.title}` : "Steer Narrative Angle"}
        subtitle="Provide custom direction or choose a tonal suggestion"
      >
        <div className="space-y-4 pb-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
              Custom Steering Guidance
            </label>
            <textarea
              value={steerText}
              onChange={(e) => setSteerText(e.target.value)}
              placeholder="e.g. Focus deeper on the psychological betrayal between the two leads..."
              className="w-full h-24 p-2.5 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-gold)] text-xs font-manuscript text-[var(--text-primary)] outline-none resize-none"
              autoFocus
            />
          </div>

          <div>
            <span className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STEER_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSteerText(sug)}
                  className="text-left px-2 py-1 rounded-[2px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[11px] font-manuscript text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setSteerTake(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteSteer}
              disabled={!steerText.trim() || isSubmittingSteer}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {isSubmittingSteer ? <Loader2 size={13} className="animate-spin" /> : <Sliders size={13} />}
              Apply Steering
            </button>
          </div>
        </div>
      </MobileStageSheet>

      {/* Push Further Drawer */}
      <MobileStageSheet
        isOpen={Boolean(pushTake)}
        onClose={() => setPushTake(null)}
        title={pushTake ? `Push Further: ${pushTake.title}` : "Push Narrative Angle"}
        subtitle="Intensify the stakes, deepen the mystery, and sharpen conflict"
      >
        <div className="space-y-4 pb-4">
          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5">
              Push Instruction (Optional)
            </label>
            <input
              type="text"
              value={pushText}
              onChange={(e) => setPushText(e.target.value)}
              placeholder="e.g. Raise the personal stakes and make the mystery irrevocable"
              className="w-full px-3 py-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-gold)] text-xs font-manuscript text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setPushTake(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => pushTake && handleExecutePush(pushTake)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              Push Angle
            </button>
          </div>
        </div>
      </MobileStageSheet>
    </div>
  );
};
