import React, { useState } from "react";
import {
  Compass,
  ArrowRight,
  Sliders,
  ChevronRight,
  Shield,
  BookOpen,
  Lock,
  Layers,
  AlertTriangle,
  Loader2,
  Sparkles,
  Flame,
  Check,
} from "lucide-react";
import { StageHero } from "../components/StageHero";
import { StageToolDock, ToolDockAction } from "../components/StageToolDock";
import { MobileStageSheet } from "../components/MobileStageSheet";
import { STANDARD_GENRES } from "../../../components/PhysicsStage";
import { LINGUISTIC_BASES } from "../../../lib/wordBanks";
import type { PhysicsConfig } from "../../../types";
import type {
  BlueprintSelectionV1,
  BlueprintCategorySelection,
  ForgeExecutionPreference,
} from "../../../contracts/blueprintSelection";

interface AdventureBlueprintWorkspaceProps {
  physics: PhysicsConfig;
  onChangePhysics: (updated: PhysicsConfig) => void;
  onProceed: () => void;
  isCanonActive: boolean;
  chosenTitle: string;
  forgeExecutionMode?: ForgeExecutionPreference;
  onChangeForgeExecutionMode?: (mode: ForgeExecutionPreference) => void;
  blueprintSelection?: BlueprintSelectionV1 | null;
  blueprintBusy?: boolean;
  blueprintError?: string | null;
  onOpenBlueprint?: () => void;
  onSaveBlueprint?: (selection: BlueprintSelectionV1) => void;
  workingTitle?: string;
  isSaved?: boolean;
}

const VIOLENCE_OPTIONS: Array<PhysicsConfig["violence"]> = ["None", "Implied", "Moderate", "Graphic"];
const HORROR_OPTIONS = ["None", "Atmospheric & Eerie", "Dread & Psychological", "Visceral & Supernatural"];

export const AdventureBlueprintWorkspace: React.FC<AdventureBlueprintWorkspaceProps> = ({
  physics,
  onChangePhysics,
  onProceed,
  isCanonActive: _isCanonActive,
  chosenTitle,
  forgeExecutionMode = "continuous",
  onChangeForgeExecutionMode,
  blueprintSelection = null,
  blueprintBusy = false,
  blueprintError = null,
  onOpenBlueprint,
  onSaveBlueprint: _onSaveBlueprint,
  workingTitle,
  isSaved = false,
}) => {
  // Mobile sheet states
  const [selectedCategory, setSelectedCategory] = useState<BlueprintCategorySelection | null>(null);
  const [isRulesSheetOpen, setIsRulesSheetOpen] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);

  const updatePhysics = <K extends keyof PhysicsConfig>(field: K, val: PhysicsConfig[K]) => {
    onChangePhysics({
      ...physics,
      [field]: val,
    });
  };

  const categories = blueprintSelection?.categories || [];
  const targetTokens = blueprintSelection?.loreLibraryBudget?.targetTokens || 12000;
  const loreRange = blueprintSelection?.lorebookRange || { min: 25, ideal: 40, max: 60 };

  const secondaryActions: ToolDockAction[] = [
    {
      id: "open-studio",
      label: "Open Full Studio",
      icon: <Sliders size={14} />,
      onClick: () => {
        if (onOpenBlueprint) onOpenBlueprint();
      },
      disabled: blueprintBusy,
      loading: blueprintBusy,
      title: "Open full Blueprint Studio to edit all category targets & mechanic packs",
    },
    {
      id: "rules-physics",
      label: "Rules & Physics",
      icon: <Flame size={14} className="text-[var(--accent-gold)]" />,
      onClick: () => setIsRulesSheetOpen(true),
      title: "Configure genre physics, violence, horror, and linguistic boundaries",
    },
    ...(onChangeForgeExecutionMode
      ? [
          {
            id: "execution-mode",
            label: forgeExecutionMode === "continuous" ? "Mode: Continuous" : "Mode: Step-by-Step",
            icon: <Layers size={14} />,
            onClick: () =>
              onChangeForgeExecutionMode(
                forgeExecutionMode === "continuous" ? "step_by_step" : "continuous"
              ),
            title: "Toggle Forge generation execution preference",
          },
        ]
      : []),
  ];

  const primaryAction: ToolDockAction = {
    id: "enter-forge",
    label: blueprintBusy ? "Preparing..." : "Enter Forge",
    icon: <ArrowRight size={15} />,
    onClick: onProceed,
    disabled: blueprintBusy || !blueprintSelection,
    loading: blueprintBusy,
    title: blueprintSelection
      ? `Generate lorebook according to current plan for ${chosenTitle || "scenario"}`
      : "Open or generate Blueprint plan to proceed",
  };

  return (
    <div id="adventure-blueprint-workspace" className="w-full flex flex-col min-h-0 space-y-6">
      {/* Stage Header */}
      <StageHero
        stageNumber={3}
        stageName="Blueprint"
        stageSubtitle="Rules & Physics"
        title="Calibrate the world's forces."
        description="A structured architectural plan for your lorebook. Review the planned entity matrix, calibrate atmospheric physics, and set your lore budget before entering the Forge."
        workingTitle={workingTitle || chosenTitle}
        isSaved={isSaved}
      />

      {/* Blueprint Error Alert */}
      {blueprintError && (
        <div
          role="alert"
          className="p-4 rounded-[4px] bg-[var(--surface-panel)] border border-[var(--status-danger)] flex items-start justify-between gap-3 text-xs text-[var(--text-primary)] font-manuscript"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--status-danger)] shrink-0" />
            <span>{blueprintError}</span>
          </div>
          {onOpenBlueprint && (
            <button
              type="button"
              onClick={onOpenBlueprint}
              className="btn-secondary text-[11px] py-1 px-2.5 shrink-0"
            >
              Reopen Studio
            </button>
          )}
        </div>
      )}

      {/* Blueprint Content Workspace (Desktop: 2 Columns / Mobile: Stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-5xl mx-auto">
        {/* Left Column (8 cols): Build Matrix & Rules & Physics */}
        <div className="lg:col-span-8 space-y-5">
          {/* Build Matrix Card */}
          <section
            aria-labelledby="build-matrix-title"
            className="adventure-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
              <div className="space-y-0.5">
                <h2
                  id="build-matrix-title"
                  className="text-base font-serif-title font-semibold text-[var(--text-primary)]"
                >
                  Build Matrix
                </h2>
                <p className="text-xs font-manuscript text-[var(--text-secondary)]">
                  Authoritative planned coverage categories derived from your premise & chosen angle.
                </p>
              </div>

              {blueprintSelection?.interfaceMode && (
                <span className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-app)] border border-[var(--border-gold)] text-[10px] font-mono text-[var(--accent-gold)] uppercase font-semibold">
                  {blueprintSelection.interfaceMode.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Dynamic Data-Driven Category Rows */}
            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className="group flex items-center justify-between p-3 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--border-gold)] transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-serif-title font-medium text-[var(--text-primary)] truncate">
                          {category.label}
                        </span>
                        {category.userLocked && (
                          <span title="User locked">
                            <Lock size={12} className="text-[var(--accent-gold)] shrink-0" />
                          </span>
                        )}
                        {category.custom && (
                          <span className="text-[9px] font-mono uppercase text-[var(--accent-sage)] bg-[var(--surface-panel)] px-1 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      {category.purpose && (
                        <p className="text-[11px] font-manuscript text-[var(--text-muted)] truncate max-w-md">
                          {category.purpose}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                        {category.targetRange?.min ?? 0}–{category.targetRange?.max ?? 0}
                      </span>
                      <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--surface-panel)] text-[var(--text-secondary)]">
                        {category.detail || "Standard"}
                      </span>
                      <ChevronRight size={15} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-[3px] bg-[var(--surface-app)] border border-dashed border-[var(--border-soft)] text-center space-y-2">
                <p className="text-xs font-manuscript text-[var(--text-secondary)]">
                  No Blueprint plan loaded for this scenario yet.
                </p>
                {onOpenBlueprint && (
                  <button
                    type="button"
                    onClick={onOpenBlueprint}
                    className="btn-primary text-xs"
                  >
                    <Sparkles size={13} className="inline mr-1" /> Open Blueprint Studio
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Progressive-Disclosure Rules & Physics Section */}
          <section
            aria-labelledby="rules-physics-title"
            className="adventure-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
              <div className="space-y-0.5">
                <h2
                  id="rules-physics-title"
                  className="text-base font-serif-title font-semibold text-[var(--text-primary)]"
                >
                  Rules & Physics Constraints
                </h2>
                <p className="text-xs font-manuscript text-[var(--text-secondary)]">
                  Genre boundaries, tone, violence, and linguistic calibration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllRules(!showAllRules)}
                className="text-xs font-mono text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                {showAllRules ? "Collapse" : "Adjust Constraints"}
              </button>
            </div>

            {/* Quick Summary Chips */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <div className="px-2.5 py-1 rounded-[2px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Genre: </span>
                <span className="text-[var(--text-primary)] font-semibold">{physics.genre || "Drama & Psychological Realism"}</span>
              </div>
              <div className="px-2.5 py-1 rounded-[2px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Violence: </span>
                <span className="text-[var(--text-primary)]">{physics.violence || "None"}</span>
              </div>
              <div className="px-2.5 py-1 rounded-[2px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Language: </span>
                <span className="text-[var(--text-primary)]">{physics.linguisticBase || "English"}</span>
              </div>
            </div>

            {/* Expanded Controls with Clean Form Fields */}
            {showAllRules && (
              <div className="pt-3 border-t border-[var(--border-soft)] space-y-4 text-xs">
                {/* Primary Genre Dropdown */}
                <div className="space-y-1">
                  <label className="block font-mono text-[var(--text-secondary)]">
                    Primary Scenario Framework
                  </label>
                  <select
                    value={
                      !physics.genre
                        ? "Drama & Psychological Realism"
                        : STANDARD_GENRES.includes(physics.genre)
                        ? physics.genre
                        : "__custom__"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        updatePhysics("genre", STANDARD_GENRES.includes(physics.genre || "") ? "" : physics.genre);
                      } else {
                        updatePhysics("genre", val);
                      }
                    }}
                    className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] font-manuscript outline-none cursor-pointer"
                  >
                    <optgroup label="Broad & Versatile Genres">
                      {STANDARD_GENRES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Custom Genre Specification">
                      <option value="__custom__">✦ Custom Genre (Type your own...)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Custom Genre Text */}
                {(!physics.genre || !STANDARD_GENRES.includes(physics.genre)) && (
                  <div className="space-y-1">
                    <label className="block font-mono text-[var(--text-secondary)]">
                      Custom Scenario Genre Name
                    </label>
                    <input
                      type="text"
                      value={physics.genre || ""}
                      onChange={(e) => updatePhysics("genre", e.target.value)}
                      placeholder="e.g. Solarpunk Diplomatic Thriller, Nautical Horror"
                      className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] font-manuscript outline-none"
                    />
                  </div>
                )}

                {/* Subgenre Text */}
                <div className="space-y-1">
                  <label className="block font-mono text-[var(--text-secondary)]">
                    Subgenre / Tonal Flavor (Optional)
                  </label>
                  <input
                    type="text"
                    value={physics.subgenre || ""}
                    onChange={(e) => updatePhysics("subgenre", e.target.value)}
                    placeholder="e.g. Dinner Party Melodrama, Workplace Satire"
                    className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] font-manuscript outline-none"
                  />
                </div>

                {/* Violence & Horror Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[var(--text-secondary)]">Violence</label>
                    <select
                      value={physics.violence || "None"}
                      onChange={(e) => updatePhysics("violence", e.target.value as PhysicsConfig["violence"])}
                      className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      {VIOLENCE_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[var(--text-secondary)]">Horror & Dread</label>
                    <select
                      value={physics.horror || "None"}
                      onChange={(e) => updatePhysics("horror", e.target.value)}
                      className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      {HORROR_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linguistic Base */}
                <div className="space-y-1">
                  <label className="block font-mono text-[var(--text-secondary)]">Linguistic Base</label>
                  <select
                    value={physics.linguisticBase || "Anglo-Saxon / Germanic"}
                    onChange={(e) => updatePhysics("linguisticBase", e.target.value)}
                    className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
                  >
                    {LINGUISTIC_BASES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Must Include & Must Avoid Directives */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[var(--text-secondary)]">
                      Must Include Directives
                    </label>
                    <input
                      type="text"
                      value={physics.mustInclude || ""}
                      onChange={(e) => updatePhysics("mustInclude", e.target.value)}
                      placeholder="e.g. Ancient clocktower, forbidden letters"
                      className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[var(--text-secondary)]">
                      Must Avoid Directives
                    </label>
                    <input
                      type="text"
                      value={physics.mustAvoid || ""}
                      onChange={(e) => updatePhysics("mustAvoid", e.target.value)}
                      placeholder="e.g. Chosen one tropes, modern slang"
                      className="w-full p-2 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-xs font-manuscript text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (4 cols): Build Summary & Telemetry */}
        <aside aria-label="Build Summary" className="lg:col-span-4 space-y-4">
          <div className="adventure-card p-5 space-y-4 sticky top-4">
            <div className="border-b border-[var(--border-soft)] pb-3">
              <h3 className="text-sm font-serif-title font-semibold text-[var(--text-primary)]">
                Build Telemetry
              </h3>
              <p className="text-[11px] font-manuscript text-[var(--text-secondary)]">
                Lorebook scope and compiler targets.
              </p>
            </div>

            <div className="space-y-3 text-xs font-manuscript">
              {/* Lore Library Token Target */}
              <div className="p-3 rounded-[3px] bg-[var(--surface-app)] border border-[var(--border-soft)] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                  Lore Library Size
                </span>
                <strong className="text-lg font-mono font-bold text-[var(--accent-gold)] block">
                  {targetTokens.toLocaleString()} tokens
                </strong>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Target: {loreRange.min}–{loreRange.max} focused lore entries
                </span>
              </div>

              {/* Artifact Outputs */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                  Artifact Targets
                </span>
                <div className="space-y-1">
                  {(blueprintSelection?.artifactTargets || ["narrator_world", "world_book_primary"]).map(
                    (target) => (
                      <div
                        key={target}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]"
                      >
                        <Check size={12} className="text-[var(--accent-gold)] shrink-0" />
                        <span className="capitalize">{target.replace(/_/g, " ")}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Graph Status */}
              <div className="pt-2 border-t border-[var(--border-soft)] space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[var(--text-muted)]">Graph Revision:</span>
                  <span className="text-[var(--text-primary)]">
                    rev {blueprintSelection?.sourceProjectRevision ?? 1}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[var(--text-muted)]">Categories:</span>
                  <span className="text-[var(--text-primary)]">{categories.length} total</span>
                </div>
              </div>

              {/* Full Studio Trigger */}
              {onOpenBlueprint && (
                <button
                  type="button"
                  onClick={onOpenBlueprint}
                  disabled={blueprintBusy}
                  className="w-full mt-2 py-2 px-3 rounded-[3px] bg-[var(--surface-panel-raised)] border border-[var(--border-gold)] hover:border-[var(--accent-gold)] text-xs font-mono font-semibold text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>Configure Full Blueprint</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Shared Stage Tool Dock */}
      <div className="w-full max-w-5xl mx-auto pt-2">
        <StageToolDock
          secondaryActions={secondaryActions}
          primaryAction={primaryAction}
          statusMessage={
            blueprintSelection
              ? `${categories.length} categories planned · ${targetTokens.toLocaleString()} tokens`
              : "Blueprint plan required before Forge"
          }
        />
      </div>

      {/* Category Detail Mobile/Desktop Sheet */}
      <MobileStageSheet
        isOpen={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.label || "Category Details"}
        subtitle={selectedCategory?.purpose || "Blueprint Category Specification"}
      >
        {selectedCategory && (
          <div className="space-y-4 pb-4 text-xs font-manuscript">
            <div className="p-3 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                Target Entity Range
              </span>
              <strong className="text-base font-mono text-[var(--accent-gold)]">
                {selectedCategory.targetRange?.min ?? 0} to {selectedCategory.targetRange?.max ?? 0} entities
              </strong>
            </div>

            {selectedCategory.justification && (
              <div>
                <span className="text-[11px] font-mono uppercase text-[var(--accent-gold)] block mb-1">
                  Architectural Justification
                </span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {selectedCategory.justification}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-soft)] text-xs font-mono">
              <span className="text-[var(--text-muted)]">Detail Level:</span>
              <span className="text-[var(--text-primary)] uppercase">{selectedCategory.detail}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </MobileStageSheet>

      {/* Rules & Physics Mobile Sheet */}
      <MobileStageSheet
        isOpen={isRulesSheetOpen}
        onClose={() => setIsRulesSheetOpen(false)}
        title="Rules & Physics Constraints"
        subtitle="Genre, boundaries, and linguistic base"
      >
        <div className="space-y-4 pb-4 text-xs font-manuscript">
          <div className="space-y-1">
            <label className="block font-mono text-[var(--text-secondary)]">Framework Genre</label>
            <select
              value={
                !physics.genre
                  ? "Drama & Psychological Realism"
                  : STANDARD_GENRES.includes(physics.genre)
                  ? physics.genre
                  : "__custom__"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__custom__") {
                  updatePhysics("genre", STANDARD_GENRES.includes(physics.genre || "") ? "" : physics.genre);
                } else {
                  updatePhysics("genre", val);
                }
              }}
              className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
            >
              <optgroup label="Broad & Versatile Genres">
                {STANDARD_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Genre Specification">
                <option value="__custom__">✦ Custom Genre (Type your own...)</option>
              </optgroup>
            </select>
          </div>

          {(!physics.genre || !STANDARD_GENRES.includes(physics.genre)) && (
            <div className="space-y-1">
              <label className="block font-mono text-[var(--text-secondary)]">Custom Genre Name</label>
              <input
                type="text"
                value={physics.genre || ""}
                onChange={(e) => updatePhysics("genre", e.target.value)}
                placeholder="e.g. Nautical Horror"
                className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block font-mono text-[var(--text-secondary)]">Subgenre / Tonal Flavor</label>
            <input
              type="text"
              value={physics.subgenre || ""}
              onChange={(e) => updatePhysics("subgenre", e.target.value)}
              placeholder="e.g. Dinner Party Melodrama"
              className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-[var(--text-secondary)]">Violence</label>
            <select
              value={physics.violence || "None"}
              onChange={(e) => updatePhysics("violence", e.target.value as PhysicsConfig["violence"])}
              className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
            >
              {VIOLENCE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-[var(--text-secondary)]">Horror & Dread</label>
            <select
              value={physics.horror || "None"}
              onChange={(e) => updatePhysics("horror", e.target.value)}
              className="w-full p-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] text-[var(--text-primary)] outline-none"
            >
              {HORROR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setIsRulesSheetOpen(false)}
              className="btn-primary text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </MobileStageSheet>
    </div>
  );
};
