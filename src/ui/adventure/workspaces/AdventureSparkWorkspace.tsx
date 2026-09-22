import React, { useState } from "react";
import { Sparkles, Dices, Anchor, ArrowRight, BookOpen } from "lucide-react";
import { StageHero } from "../components/StageHero";
import { ParchmentEditor } from "../components/ParchmentEditor";
import { StageToolDock, ToolDockAction } from "../components/StageToolDock";
import { MobileStageSheet } from "../components/MobileStageSheet";
import { AdventureMarginPanel } from "./AdventureMarginPanel";
import { rollCollision } from "../../../lib/wordBanks";
import type { GenerationSettings, SparkParse, CanonConfig } from "../../../types";
import type { GenerationActivityProps } from "../../../components/GenerationActivity";
import type { PremiseSuggestionSet } from "../../../contracts/premiseSuggestions";

interface AdventureSparkWorkspaceProps {
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
  generationActivity?: GenerationActivityProps;
  premiseSuggestions?: PremiseSuggestionSet | null;
  onGeneratePremiseSuggestions?: () => void;
  isGeneratingPremises?: boolean;
  parse?: SparkParse;
  onUpdateParse?: (updated: SparkParse) => void;
  canon: CanonConfig;
  onUpdateCanon: (updated: CanonConfig) => void;
  workingTitle?: string;
  isSaved?: boolean;
}

export const AdventureSparkWorkspace: React.FC<AdventureSparkWorkspaceProps> = ({
  sparkText,
  onChangeSpark,
  onProceed,
  isLoading,
  onAnalyzeMargin,
  isParsingMargin = false,
  hasParsedMargin = false,
  onOpenMargin,
  settings,
  premiseSuggestions,
  onGeneratePremiseSuggestions,
  isGeneratingPremises = false,
  parse,
  onUpdateParse,
  canon,
  onUpdateCanon,
  workingTitle,
  isSaved = false,
}) => {
  const [isMobileMarginOpen, setIsMobileMarginOpen] = useState(false);
  const [isInspireSheetOpen, setIsInspireSheetOpen] = useState(false);
  const [isTumbling, setIsTumbling] = useState(false);

  const handleCollide = () => {
    setIsTumbling(true);
    const rolled = rollCollision();
    onChangeSpark(rolled.combined);
    setTimeout(() => setIsTumbling(false), 450);
  };

  const handleSelectSuggestion = (premise: string) => {
    onChangeSpark(premise);
    setIsInspireSheetOpen(false);
  };

  const authorFlavorLabel = settings?.authorFlavor?.manualAuthorId
    ? `Flavor: ${settings.authorFlavor.manualAuthorId}`
    : undefined;

  const secondaryActions: ToolDockAction[] = [
    {
      id: "inspire",
      label: "Inspire",
      icon: <Sparkles size={14} className="text-[var(--accent-gold)]" />,
      onClick: () => {
        if (onGeneratePremiseSuggestions && !premiseSuggestions) {
          onGeneratePremiseSuggestions();
        }
        setIsInspireSheetOpen(true);
      },
      loading: isGeneratingPremises,
      title: "View or generate premise sparks",
    },
    {
      id: "collide",
      label: "Collide",
      icon: <Dices size={14} className={`text-[var(--accent-gold)] ${isTumbling ? "animate-spin" : ""}`} />,
      onClick: handleCollide,
      title: "Roll a collision of uncanny creative concepts",
    },
    {
      id: "analyze-margin",
      label: isParsingMargin ? "Inking Anchors..." : "Analyze Margin",
      icon: <Anchor size={14} className="text-[var(--accent-gold)]" />,
      onClick: () => {
        if (onAnalyzeMargin) onAnalyzeMargin();
      },
      loading: isParsingMargin,
      title: "Analyze and extract fidelity anchors from your premise",
      badge: parse?.nonNegotiables.length ? parse.nonNegotiables.length : undefined,
    },
    {
      id: "open-margin",
      label: "Margin",
      icon: <BookOpen size={14} />,
      onClick: () => {
        if (onOpenMargin) onOpenMargin();
        setIsMobileMarginOpen(true);
      },
      title: "Inspect fidelity anchors & canon",
    },
  ];

  const primaryAction: ToolDockAction = {
    id: "proceed",
    label: isLoading ? "Exploring Angles..." : "Examine Divergence",
    icon: <ArrowRight size={15} />,
    onClick: onProceed,
    disabled: !sparkText.trim() || isLoading || isParsingMargin,
    loading: isLoading,
    title: !sparkText.trim() ? "Write a premise before proceeding" : "Advance to Stage 2: Divergence",
  };

  return (
    <div id="adventure-spark-workspace" className="w-full flex flex-col min-h-0 space-y-6">
      {/* Stage Header */}
      <StageHero
        stageNumber={1}
        stageName="Spark"
        stageSubtitle="Origin Seed"
        title="Lay down the spark."
        description="A premise, a vibe, a mashup, or a roleplay scenario. Write freely on the manuscript parchment, then analyze fidelity anchors to lock in your core truths."
        workingTitle={workingTitle}
        isSaved={isSaved}
      />

      {/* Main Parchment Writing Surface */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
        <ParchmentEditor
          value={sparkText}
          onChange={onChangeSpark}
          chapterTitle={workingTitle ? `Chapter I · ${workingTitle}` : "Chapter I · Origin Seed"}
          authorFlavorLabel={authorFlavorLabel}
          disabled={isLoading || isParsingMargin}
          onClear={() => onChangeSpark("")}
        />
      </div>

      {/* Shared Stage Tool Dock */}
      <div className="w-full max-w-4xl mx-auto pt-2">
        <StageToolDock
          secondaryActions={secondaryActions}
          primaryAction={primaryAction}
          statusMessage={
            hasParsedMargin
              ? `${parse?.nonNegotiables.length || 0} anchors extracted · Ready for divergence`
              : "Ready to distill anchors and forge 4 divergence paths"
          }
        />
      </div>

      {/* Mobile Margin Drawer Sheet */}
      <MobileStageSheet
        isOpen={isMobileMarginOpen}
        onClose={() => setIsMobileMarginOpen(false)}
        title="World Margin & Context"
        subtitle="Fidelity Anchors & Canon Enforcement"
      >
        <div className="min-h-[300px]">
          <AdventureMarginPanel
            parse={parse}
            onUpdateParse={onUpdateParse}
            canon={canon}
            onUpdateCanon={onUpdateCanon}
            currentStage={1}
            onClose={() => setIsMobileMarginOpen(false)}
          />
        </div>
      </MobileStageSheet>

      {/* Inspire / Starter Sparks Sheet */}
      <MobileStageSheet
        isOpen={isInspireSheetOpen}
        onClose={() => setIsInspireSheetOpen(false)}
        title="Creative Inspirations & Sparks"
        subtitle="Select a premise spark to illuminate the manuscript"
      >
        <div className="space-y-3 pb-4">
          {premiseSuggestions && premiseSuggestions.suggestions.length > 0 ? (
            <div className="space-y-2">
              {premiseSuggestions.suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion.premise)}
                  className="w-full text-left p-3 rounded-[3px] bg-[var(--surface-panel)] hover:border-[var(--border-gold)] border border-[var(--border-soft)] transition-colors space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--accent-gold)]">
                    <span className="font-semibold uppercase tracking-wider">{suggestion.title}</span>
                    <span className="text-[var(--text-muted)]">{suggestion.category}</span>
                  </div>
                  <p className="text-xs font-manuscript text-[var(--text-primary)] line-clamp-3">
                    {suggestion.premise}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs font-manuscript text-[var(--text-secondary)]">
                Roll random collisions or generate novel premise sets.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCollide}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Dices size={13} /> Roll Collision
                </button>
                {onGeneratePremiseSuggestions && (
                  <button
                    type="button"
                    onClick={onGeneratePremiseSuggestions}
                    disabled={isGeneratingPremises}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Sparkles size={13} /> {isGeneratingPremises ? "Generating..." : "Generate Sparks"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </MobileStageSheet>
    </div>
  );
};
