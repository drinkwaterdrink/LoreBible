import React, { useState } from "react";
import {
  Entry,
  LoreBibleDocument,
  GenerationSettings,
} from "../types";
import { TableOfContents } from "./refine/TableOfContents";
import { MarginInspector } from "./refine/MarginInspector";
import { InlineEditableField } from "./refine/InlineEditableField";
import { ProofreaderHeader } from "./refine/ProofreaderMarkup";
import { Download, Undo2, Redo2, BookOpen, Network, Gauge, Dice5, FileSearch, AlignJustify } from "lucide-react";
import { RelationshipWeb } from "./visual/RelationshipWeb";
import { PressureMap } from "./visual/PressureMap";
import { ProceduralRollsEditor } from "./refine/ProceduralRollsEditor";
import { TestBenchEditor } from "./refine/TestBenchEditor";
import { GenerationFailureNotice } from "./GenerationFailureNotice";
import { useRefineController } from "../hooks/useRefineController";

interface RefineStageProps {
  document: LoreBibleDocument;
  onUpdateDocument: (updated: LoreBibleDocument) => void;
  onOpenExport: () => void;
  settings: GenerationSettings;
  onOpenConnections: () => void;
}

export const RefineStage: React.FC<RefineStageProps> = ({
  document,
  onUpdateDocument,
  onOpenExport,
  settings,
  onOpenConnections,
}) => {
  // Center Sheet View Tab: Manuscript vs Relationship Web vs Pressure Map vs Procedural Rolls vs Test Bench
  const [centerTab, setCenterTab] = useState<
    "manuscript" | "relationshipWeb" | "pressureMap" | "proceduralRolls" | "testBench"
  >("manuscript");

  // Density toggle (Comfortable vs Compact)
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem("lore_bible_density_v1") === "compact";
    } catch {
      return false;
    }
  });

  const handleToggleDensity = () => {
    setIsCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lore_bible_density_v1", next ? "compact" : "comfortable");
      } catch {}
      return next;
    });
  };

  const {
    currentDoc,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    pushDocMutation,

    activeSectionId,
    setActiveSectionId,
    selectedEntryId,
    setSelectedEntryId,
    selectedSectionKey,
    setSelectedSectionKey,
    currentSelectedEntry,

    findings,
    isAuditing,
    handleRunAudit,
    handleApplyFindingFix,
    handleDismissFinding,
    handleClearAllFindings,
    findingsForSelected,

    rippleNotice,
    handleRegenerateRippleReferences,

    isRerollingEntry,
    handleRerollEntry,
    variants,
    isLoadingVariants,
    handleFetchVariants,
    handlePickVariant,
    clearVariants,
    isPushingEntry,
    handlePushEntry,
    handleToggleLock,
    handleSaveMarginNote,
    handleDuplicateEntry,
    handleDeleteEntry,

    regeneratingSection,
    handleRegenerateSection,
    handleUpdateEntryField,
    handleUpdateCoreField,
    handleUpdateUserField,

    operationError,
    setOperationError,

    allEntriesList,
    liveStats,
    lastSavedFormatted,
  } = useRefineController({
    document,
    onUpdateDocument,
    settings,
    enableKeyboardShortcuts: true,
  });

  // Scroll to section when chosen in TOC or switch to interactive view tabs
  const handleScrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    if (sectionId === "testBench") {
      setCenterTab("testBench");
      return;
    }
    if (sectionId === "proceduralRolls") {
      setCenterTab("proceduralRolls");
      return;
    }
    if (sectionId === "relationshipWeb") {
      setCenterTab("relationshipWeb");
      return;
    }
    if (sectionId === "pressureMap") {
      setCenterTab("pressureMap");
      return;
    }

    if (centerTab !== "manuscript") {
      setCenterTab("manuscript");
    }

    setTimeout(() => {
      const el = window.document.getElementById(`manuscript-sec-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  // Helper to render section controls: small ochre Inter text buttons
  const renderSectionControls = (sectionKey: string, countLabel: string) => {
    const isRegen = regeneratingSection === sectionKey;
    return (
      <div className="flex items-center gap-2 sm:gap-3 font-apparatus text-[10px] select-none flex-wrap">
        <span className="font-mono-ui text-[10px] text-[var(--graphite)] shrink-0">
          {countLabel}
        </span>
        <button
          type="button"
          disabled={isRegen}
          onClick={() => handleRegenerateSection(sectionKey)}
          className="text-[var(--gold)] hover:text-[var(--ink)] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isRegen ? "Inking Section..." : "Regenerate Unlocked"}
        </button>
        <button
          type="button"
          disabled={isRegen}
          onClick={() => handleRegenerateSection(sectionKey, 1)}
          className="text-[var(--graphite)] hover:text-[var(--ink)] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          + Add Entry
        </button>
        <button
          type="button"
          disabled={isRegen}
          onClick={() => handleRegenerateSection(sectionKey, 3)}
          className="text-[var(--graphite)] hover:text-[var(--ink)] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          + Add 3 Entries
        </button>
      </div>
    );
  };

  return (
    <div
      id="refine-stage-root"
      className={`w-full pb-20 ${isCompact ? "manuscript-compact" : ""}`}
    >
      {/* 1. TOP MANUSCRIPT BANNER & HISTORY RIBBON */}
      <header className="sticky top-0 z-20 bg-[var(--vellum)]/95 backdrop-blur-xs border-b border-[var(--ink-soft)] px-3 sm:px-4 py-2 sm:py-2.5 mb-4 sm:mb-6 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <span className="text-[9px] font-apparatus font-bold uppercase tracking-widest text-[var(--graphite)] block">
              Stage 05 · The Working Manuscript
            </span>
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-manuscript font-semibold text-[var(--ink)] leading-tight truncate">
                {currentDoc.core.title}
              </h1>
              <span className="text-xs italic font-manuscript text-[var(--graphite)] shrink-0 hidden xs:inline">
                — {currentDoc.physics.density} World
              </span>
            </div>
          </div>
        </div>

        {/* History / Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Density Toggle (Comfortable vs Compact) */}
          <button
            type="button"
            onClick={handleToggleDensity}
            title={`Switch to ${isCompact ? "Comfortable" : "Compact"} density`}
            className="px-2 sm:px-2.5 py-1 text-xs font-apparatus uppercase tracking-wider text-[var(--ink)] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] hover:border-[var(--graphite)] rounded-[2px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <AlignJustify size={12} className="text-[var(--gold)]" />
            <span className="hidden sm:inline">{isCompact ? "Compact" : "Comfortable"}</span>
          </button>

          {/* Undo / Redo Cluster */}
          <div className="inline-flex border border-[var(--ink-soft)] rounded-[2px] overflow-hidden bg-[var(--vellum-raised)]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Cmd/Ctrl + Z)"
              className="px-2.5 py-1 text-xs text-[var(--ink)] hover:bg-[var(--vellum)] border-r border-[var(--ink-soft)] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Cmd/Ctrl + Shift + Z)"
              className="px-2.5 py-1 text-xs text-[var(--ink)] hover:bg-[var(--vellum)] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Export Button */}
          <button
            id="refine-export-btn"
            type="button"
            onClick={onOpenExport}
            className="px-3 sm:px-3.5 py-1 text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--vellum-raised)] bg-[var(--rubric)] hover:opacity-90 rounded-[2px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download size={12} />
            <span>Export Bible</span>
          </button>
        </div>
      </header>
      {operationError && <div className="mx-3 sm:mx-4 mb-4"><GenerationFailureNotice message={operationError} onOpenConnections={onOpenConnections} /></div>}

      {/* 2. THE 3-COLUMN MANUSCRIPT WORKSPACE */}
      <div className="max-w-[1520px] mx-auto px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: The Slim Section Navigator / Table of Contents (2 cols on lg) */}
        <div className="hidden lg:block lg:col-span-2 sticky top-16 max-h-[85vh] overflow-y-auto">
          <TableOfContents
            document={currentDoc}
            activeSectionId={activeSectionId}
            onSelectSection={handleScrollToSection}
            marginaliaCount={findings.filter((f) => !f.applied && !f.dismissed).length}
          />
        </div>

        {/* CENTER COLUMN: The Manuscript Page / Visual Tools (7 cols on lg, main focus) */}
        <main className="lg:col-span-7 space-y-6 min-w-0">
          {/* Small Paper Index Tabs on the Sheet Edge - Full Horizontal Scrolling on Mobile */}
          <div className="flex items-end gap-1.5 border-b border-[var(--ink-soft)] px-2 pt-1 bg-[var(--vellum-raised)]/40 rounded-t-[2px] select-none overflow-x-auto no-scrollbar touch-pan-x w-full">
            <button
              type="button"
              onClick={() => setCenterTab("manuscript")}
              className={`px-3 sm:px-3.5 py-2 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                centerTab === "manuscript"
                  ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                  : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
              }`}
            >
              <BookOpen size={12} />
              <span>The Manuscript</span>
            </button>
            <button
              type="button"
              onClick={() => setCenterTab("relationshipWeb")}
              className={`px-3 sm:px-3.5 py-2 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                centerTab === "relationshipWeb"
                  ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                  : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
              }`}
            >
              <Network size={12} />
              <span>The Relationship Web</span>
            </button>
            <button
              type="button"
              onClick={() => setCenterTab("pressureMap")}
              className={`px-3 sm:px-3.5 py-2 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                centerTab === "pressureMap"
                  ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                  : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
              }`}
            >
              <Gauge size={12} />
              <span>The Pressure Map</span>
            </button>
            <button
              type="button"
              onClick={() => setCenterTab("proceduralRolls")}
              className={`px-3 sm:px-3.5 py-2 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                centerTab === "proceduralRolls"
                  ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                  : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
              }`}
            >
              <Dice5 size={12} />
              <span>Procedural Rolls</span>
              {currentDoc.proceduralRolls && currentDoc.proceduralRolls.length > 0 && (
                <span className="font-mono-ui text-[9px] px-1 rounded bg-[var(--ink-soft)]">
                  {currentDoc.proceduralRolls.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCenterTab("testBench")}
              className={`px-3 sm:px-3.5 py-2 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                centerTab === "testBench"
                  ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                  : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
              }`}
            >
              <FileSearch size={12} />
              <span>Test Bench & Audits</span>
            </button>
          </div>

          {/* Mobile Table of Contents quick-jump pills (only shown on < lg when manuscript is active) */}
          {centerTab === "manuscript" && (
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-1.5 px-1 bg-[var(--vellum-raised)]/30 border-b border-[var(--ink-soft)]/50 rounded-b-[2px]">
              <span className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] shrink-0 font-semibold px-1">
                Jump to:
              </span>
              {[
                { id: "core", label: "Seed" },
                { id: "user", label: "User" },
                { id: "worldPhysics", label: "Physics" },
                { id: "status", label: "Status" },
                { id: "locations", label: "Locations" },
                { id: "factions", label: "Factions" },
                { id: "npcs", label: "NPCs" },
                { id: "items", label: "Items" },
                { id: "secrets", label: "Secrets" },
                { id: "conflict", label: "Conflict" },
                { id: "pressures", label: "Pressures" },
                { id: "proceduralRolls", label: "Rolls" },
                { id: "opening", label: "Opening" },
                { id: "antiGravity", label: "Anti-Gravity" },
                { id: "testBench", label: "Test Bench" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleScrollToSection(s.id)}
                  className={`text-[10px] font-apparatus uppercase px-2 py-0.5 rounded-[2px] border transition-colors shrink-0 whitespace-nowrap ${
                    activeSectionId === s.id
                      ? "bg-[var(--rubric)] text-[var(--vellum-raised)] border-[var(--rubric)] font-semibold"
                      : "bg-[var(--vellum-raised)] text-[var(--graphite)] border-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {centerTab === "relationshipWeb" && (
            <div className="space-y-6">
              <RelationshipWeb
                document={currentDoc}
                onUpdateDocument={pushDocMutation}
                onSelectNpcEntry={(npcId) => {
                  setSelectedSectionKey("npcs");
                  setSelectedEntryId(npcId);
                }}
              />
            </div>
          )}

          {centerTab === "pressureMap" && (
            <div className="space-y-6">
              <PressureMap
                document={currentDoc}
                onUpdateDocument={pushDocMutation}
                onSelectEntry={(entry) => {
                  if (currentDoc.pressures?.some((p) => p.id === entry.id)) {
                    setSelectedSectionKey("pressures");
                  } else {
                    setSelectedSectionKey("conflict");
                  }
                  setSelectedEntryId(entry.id);
                }}
              />
            </div>
          )}

          {centerTab === "proceduralRolls" && (
            <div className="space-y-6">
              <ProceduralRollsEditor
                document={currentDoc}
                settings={settings}
                onOpenConnections={onOpenConnections}
                onUpdateGroups={(groups) =>
                  pushDocMutation({ ...currentDoc, proceduralRolls: groups })
                }
                sparkText={currentDoc.sparkText}
              />
            </div>
          )}

          {centerTab === "testBench" && (
            <div className="space-y-6">
              <TestBenchEditor
                document={currentDoc}
                settings={settings}
                onOpenConnections={onOpenConnections}
                onUpdateDocument={pushDocMutation}
                sparkText={currentDoc.sparkText}
              />
            </div>
          )}

          {centerTab === "manuscript" && (
            <div className="space-y-12">
              {/* Consistency Pass Proofreader Header & Grading Tally */}
              <ProofreaderHeader
                findings={findings}
                isAuditing={isAuditing}
                onRunAudit={handleRunAudit}
                onClearAll={handleClearAllFindings}
              />

          {/* ORIGIN SPARK IN HANDWRITING */}
          <div className="manuscript-sheet p-5 bg-[var(--vellum-raised)] relative">
            <span className="text-[9px] font-apparatus uppercase tracking-widest text-[var(--graphite)] block mb-1">
              Manuscript Origin Spark · The Human Hand
            </span>
            <p className="font-hand text-2xl text-[var(--ink-blue)] leading-snug">
              “{currentDoc.sparkText}”
            </p>
          </div>

          {/* 1. CORE SCENARIO SEED */}
          <section id="manuscript-sec-core" className="space-y-4">
            <div className="scribe-header">
              <span>Core Scenario Seed</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">P · Constant</span>
            </div>

            <div className="manuscript-sheet p-6 space-y-4 font-manuscript">
              {/* Pitch */}
              <div className="italic text-lg text-[var(--ink)] font-medium">
                <InlineEditableField
                  value={currentDoc.core.pitch}
                  onCommit={(val) => handleUpdateCoreField("pitch", val)}
                  multiline
                  label="Scenario Pitch"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--ink-soft)] text-xs">
                <InlineEditableField
                  label="Genre & Tone"
                  value={currentDoc.core.genreTone}
                  onCommit={(val) => handleUpdateCoreField("genreTone", val)}
                />
                <InlineEditableField
                  label="Era & Scale"
                  value={currentDoc.core.eraScale}
                  onCommit={(val) => handleUpdateCoreField("eraScale", val)}
                />
                <InlineEditableField
                  label="The Rule"
                  value={currentDoc.core.theRule}
                  onCommit={(val) => handleUpdateCoreField("theRule", val)}
                  multiline
                />
                <InlineEditableField
                  label="The Cost"
                  value={currentDoc.core.theCost}
                  onCommit={(val) => handleUpdateCoreField("theCost", val)}
                  multiline
                />
                <div className="sm:col-span-2">
                  <InlineEditableField
                    label="The Situation"
                    value={currentDoc.core.theSituation}
                    onCommit={(val) => handleUpdateCoreField("theSituation", val)}
                    multiline
                  />
                </div>
                <div className="sm:col-span-2">
                  <InlineEditableField
                    label="The Pressure"
                    value={currentDoc.core.thePressure}
                    onCommit={(val) => handleUpdateCoreField("thePressure", val)}
                    multiline
                  />
                </div>
                <div className="sm:col-span-2 text-[var(--rubric)]">
                  <InlineEditableField
                    label="The Core Question"
                    value={currentDoc.core.theQuestion}
                    onCommit={(val) => handleUpdateCoreField("theQuestion", val)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. USER ROLE & HOOKS */}
          <section id="manuscript-sec-user" className="space-y-4">
            <div className="scribe-header">
              <span>User Role & Hierarchy</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">P · Constant</span>
            </div>

            <div className="manuscript-sheet p-6 space-y-4 font-manuscript text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InlineEditableField
                  label="Role & Position"
                  value={currentDoc.user.rolePosition}
                  onCommit={(val) => handleUpdateUserField("rolePosition", val)}
                />
                <InlineEditableField
                  label="Starts With"
                  value={currentDoc.user.startsWith}
                  onCommit={(val) => handleUpdateUserField("startsWith", val)}
                />
                <InlineEditableField
                  label="Wants"
                  value={currentDoc.user.wants}
                  onCommit={(val) => handleUpdateUserField("wants", val)}
                />
                <InlineEditableField
                  label="Fears"
                  value={currentDoc.user.fears}
                  onCommit={(val) => handleUpdateUserField("fears", val)}
                />
              </div>

              {/* The Hook Formula */}
              <div className="p-4 bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] space-y-2">
                <span className="font-apparatus text-[9px] uppercase tracking-wider text-[var(--rubric)] block font-semibold">
                  The Hook Formula
                </span>
                <InlineEditableField
                  label="Pull"
                  value={currentDoc.user.hookPull}
                  onCommit={(val) => handleUpdateUserField("hookPull", val)}
                />
                <InlineEditableField
                  label="Push"
                  value={currentDoc.user.hookPush}
                  onCommit={(val) => handleUpdateUserField("hookPush", val)}
                />
                <InlineEditableField
                  label="Trap"
                  value={currentDoc.user.hookTrap}
                  onCommit={(val) => handleUpdateUserField("hookTrap", val)}
                />
              </div>
            </div>
          </section>

          {/* 3. WORLD PHYSICS */}
          <section id="manuscript-sec-worldPhysics" className="space-y-4">
            <div className="scribe-header">
              <span>World Physics & Friction Rules</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">C · Conditional</span>
            </div>

            <div className="space-y-4 font-manuscript text-[15px] text-[var(--ink)]">
              {currentDoc.worldPhysics.rules.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  className="manuscript-sheet p-4 space-y-2 relative"
                >
                  <InlineEditableField
                    label={`Rule ${idx + 1}`}
                    value={rule.fields.rule || rule.fields.name}
                    onCommit={(val) => {
                      const updatedRules = [...currentDoc.worldPhysics.rules];
                      updatedRules[idx] = {
                        ...rule,
                        fields: { ...rule.fields, rule: val },
                      };
                      pushDocMutation({
                        ...currentDoc,
                        worldPhysics: { ...currentDoc.worldPhysics, rules: updatedRules },
                      });
                    }}
                    multiline
                  />
                  <div className="grid grid-cols-2 gap-3 text-xs text-[var(--graphite)]">
                    <InlineEditableField
                      label="Profits"
                      value={rule.fields.profits || "—"}
                      onCommit={(val) => {
                        const updatedRules = [...currentDoc.worldPhysics.rules];
                        updatedRules[idx] = {
                          ...rule,
                          fields: { ...rule.fields, profits: val },
                        };
                        pushDocMutation({
                          ...currentDoc,
                          worldPhysics: { ...currentDoc.worldPhysics, rules: updatedRules },
                        });
                      }}
                    />
                    <InlineEditableField
                      label="Pays"
                      value={rule.fields.pays || "—"}
                      onCommit={(val) => {
                        const updatedRules = [...currentDoc.worldPhysics.rules];
                        updatedRules[idx] = {
                          ...rule,
                          fields: { ...rule.fields, pays: val },
                        };
                        pushDocMutation({
                          ...currentDoc,
                          worldPhysics: { ...currentDoc.worldPhysics, rules: updatedRules },
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] uppercase font-apparatus text-[var(--graphite)]">
                      Keys:
                    </span>
                    <span className="lore-key-tag">{rule.keys.join(", ")}</span>
                  </div>
                </div>
              ))}

              <div className="manuscript-sheet p-4 space-y-3 text-xs text-[var(--graphite)]">
                <InlineEditableField
                  label="Authority Check"
                  value={currentDoc.worldPhysics.authorityCheck}
                  onCommit={(val) =>
                    pushDocMutation({
                      ...currentDoc,
                      worldPhysics: { ...currentDoc.worldPhysics, authorityCheck: val },
                    })
                  }
                  multiline
                />
                <InlineEditableField
                  label="Power Ceiling"
                  value={currentDoc.worldPhysics.powerCeiling}
                  onCommit={(val) =>
                    pushDocMutation({
                      ...currentDoc,
                      worldPhysics: { ...currentDoc.worldPhysics, powerCeiling: val },
                    })
                  }
                  multiline
                />
              </div>
            </div>
          </section>

          {/* 4. CURRENT STATUS BLOCK */}
          <section id="manuscript-sec-status" className="space-y-4">
            <div className="scribe-header">
              <span>Current Status (Depth 4 World-State)</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">P · Constant</span>
            </div>

            <div className="manuscript-sheet p-5 font-manuscript text-[15px] leading-relaxed text-[var(--ink)]">
              <InlineEditableField
                value={currentDoc.status.content}
                onCommit={(val) =>
                  pushDocMutation({
                    ...currentDoc,
                    status: { ...currentDoc.status, content: val },
                  })
                }
                multiline
              />
              <div className="mt-3 pt-2 border-t border-[var(--ink-soft)]/50 text-[10px] font-mono-ui text-[var(--graphite)]">
                {currentDoc.status.settings}
              </div>
            </div>
          </section>

          {/* 5. LOCATION SEEDS */}
          <section id="manuscript-sec-locations" className="space-y-4">
            <div className="scribe-header">
              <span>Location Seeds</span>
              {renderSectionControls("locations", `${currentDoc.locations.length} seeds · [C]`)}
            </div>

            <div className="space-y-4">
              {currentDoc.locations.map((loc) => {
                const isSelected = selectedEntryId === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      setSelectedEntryId(loc.id);
                      setSelectedSectionKey("locations");
                    }}
                    className={`p-4 manuscript-sheet transition-all cursor-pointer relative ${
                      loc.locked
                        ? "border-l-4 border-l-[var(--gold)]"
                        : isSelected
                        ? "border-l-4 border-l-[var(--rubric)] ring-1 ring-[var(--ink-soft)]"
                        : "hover:border-[var(--graphite)]"
                    }`}
                  >
                    {/* Gold margin dot for locked */}
                    {loc.locked && (
                      <span
                        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[var(--gold)]"
                        title="Pinned / Locked entry"
                      />
                    )}

                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="font-manuscript font-semibold text-[17px] text-[var(--ink)]">
                        <InlineEditableField
                          value={loc.fields.name}
                          onCommit={(val) =>
                            handleUpdateEntryField("locations", loc.id, "name", val)
                          }
                        />
                      </div>
                      <span className="lore-key-tag">KEYS: {loc.keys.join(", ")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-manuscript text-[var(--ink)]">
                      <InlineEditableField
                        label="Function"
                        value={loc.fields.function}
                        onCommit={(val) =>
                          handleUpdateEntryField("locations", loc.id, "function", val)
                        }
                      />
                      <InlineEditableField
                        label="Mood"
                        value={loc.fields.mood}
                        onCommit={(val) =>
                          handleUpdateEntryField("locations", loc.id, "mood", val)
                        }
                      />
                      <InlineEditableField
                        label="What's Wrong"
                        value={loc.fields.whatsWrong}
                        onCommit={(val) =>
                          handleUpdateEntryField("locations", loc.id, "whatsWrong", val)
                        }
                      />
                    </div>

                    {loc.note && (
                      <div className="mt-2.5 font-hand text-lg text-[var(--ink-blue)] pl-3 border-l-2 border-[var(--ink-blue)]/50">
                        ✎ {loc.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. FACTION SEEDS */}
          <section id="manuscript-sec-factions" className="space-y-4">
            <div className="scribe-header">
              <span>Faction Seeds</span>
              {renderSectionControls("factions", `${currentDoc.factions.length} factions · [C]`)}
            </div>

            <div className="space-y-4">
              {currentDoc.factions.map((f) => {
                const isSelected = selectedEntryId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedEntryId(f.id);
                      setSelectedSectionKey("factions");
                    }}
                    className={`p-4 manuscript-sheet transition-all cursor-pointer relative ${
                      f.locked
                        ? "border-l-4 border-l-[var(--gold)]"
                        : isSelected
                        ? "border-l-4 border-l-[var(--rubric)] ring-1 ring-[var(--ink-soft)]"
                        : "hover:border-[var(--graphite)]"
                    }`}
                  >
                    {f.locked && (
                      <span
                        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[var(--gold)]"
                        title="Pinned / Locked entry"
                      />
                    )}
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="font-manuscript font-semibold text-[17px] text-[var(--ink)]">
                        <InlineEditableField
                          value={f.fields.name}
                          onCommit={(val) =>
                            handleUpdateEntryField("factions", f.id, "name", val)
                          }
                        />
                      </div>
                      <span className="lore-key-tag">KEYS: {f.keys.join(", ")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-manuscript">
                      <InlineEditableField
                        label="Public Face"
                        value={f.fields.publicFace}
                        onCommit={(val) =>
                          handleUpdateEntryField("factions", f.id, "publicFace", val)
                        }
                      />
                      <InlineEditableField
                        label="True Agenda"
                        value={f.fields.trueAgenda}
                        onCommit={(val) =>
                          handleUpdateEntryField("factions", f.id, "trueAgenda", val)
                        }
                      />
                      <InlineEditableField
                        label="Independent Want"
                        value={f.fields.independentWant}
                        onCommit={(val) =>
                          handleUpdateEntryField("factions", f.id, "independentWant", val)
                        }
                      />
                      <InlineEditableField
                        label="Stance Toward User"
                        value={f.fields.stanceTowardUser}
                        onCommit={(val) =>
                          handleUpdateEntryField("factions", f.id, "stanceTowardUser", val)
                        }
                      />
                    </div>

                    {f.note && (
                      <div className="mt-2.5 font-hand text-lg text-[var(--ink-blue)] pl-3 border-l-2 border-[var(--ink-blue)]/50">
                        ✎ {f.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7. NPC CAST SEEDS */}
          <section id="manuscript-sec-npcs" className="space-y-4">
            <div className="scribe-header">
              <span>NPC Cast Seeds · Voices & Bodies</span>
              {renderSectionControls("npcs", `${currentDoc.npcs.length} cast · [C]`)}
            </div>

            <div className="space-y-5">
              {currentDoc.npcs.map((npc) => {
                const isSelected = selectedEntryId === npc.id;
                return (
                  <div
                    key={npc.id}
                    onClick={() => {
                      setSelectedEntryId(npc.id);
                      setSelectedSectionKey("npcs");
                    }}
                    className={`p-5 manuscript-sheet transition-all cursor-pointer relative ${
                      npc.locked
                        ? "border-l-4 border-l-[var(--gold)]"
                        : isSelected
                        ? "border-l-4 border-l-[var(--rubric)] ring-1 ring-[var(--ink-soft)]"
                        : "hover:border-[var(--graphite)]"
                    }`}
                  >
                    {npc.locked && (
                      <span
                        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[var(--gold)]"
                        title="Pinned / Locked entry"
                      />
                    )}

                    <div className="flex items-baseline justify-between border-b border-[var(--ink-soft)] pb-2 mb-3">
                      <div className="flex items-baseline gap-2">
                        <div className="font-manuscript font-semibold text-lg text-[var(--ink)]">
                          <InlineEditableField
                            value={npc.fields.name}
                            onCommit={(val) =>
                              handleUpdateEntryField("npcs", npc.id, "name", val)
                            }
                          />
                        </div>
                        <span className="text-xs text-[var(--graphite)] italic font-manuscript">
                          — {npc.fields.role}
                        </span>
                      </div>
                      <span className="lore-key-tag">KEYS: {npc.keys.join(", ")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-manuscript">
                      <InlineEditableField
                        label="Wants"
                        value={npc.fields.wants}
                        onCommit={(val) =>
                          handleUpdateEntryField("npcs", npc.id, "wants", val)
                        }
                      />
                      <InlineEditableField
                        label="Body & Physicality"
                        value={npc.fields.body}
                        onCommit={(val) =>
                          handleUpdateEntryField("npcs", npc.id, "body", val)
                        }
                      />
                      <div className="text-[var(--rubric)]">
                        <InlineEditableField
                          label="Voice & Cadence"
                          value={npc.fields.voice}
                          onCommit={(val) =>
                            handleUpdateEntryField("npcs", npc.id, "voice", val)
                          }
                        />
                      </div>
                      <InlineEditableField
                        label="Not-Default"
                        value={npc.fields.notDefault}
                        onCommit={(val) =>
                          handleUpdateEntryField("npcs", npc.id, "notDefault", val)
                        }
                      />
                      <InlineEditableField
                        label="Holds"
                        value={npc.fields.holds}
                        onCommit={(val) =>
                          handleUpdateEntryField("npcs", npc.id, "holds", val)
                        }
                      />
                      <InlineEditableField
                        label="Connection"
                        value={npc.fields.connection}
                        onCommit={(val) =>
                          handleUpdateEntryField("npcs", npc.id, "connection", val)
                        }
                      />
                    </div>

                    {npc.note && (
                      <div className="mt-2.5 font-hand text-lg text-[var(--ink-blue)] pl-3 border-l-2 border-[var(--ink-blue)]/50">
                        ✎ {npc.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8. RELATIONSHIP WEB */}
          <section id="manuscript-sec-relationshipWeb" className="space-y-4">
            <div className="scribe-header">
              <span>Relationship Web</span>
              {renderSectionControls("relationshipWeb", `${currentDoc.relationshipWeb.length} bonds · [C]`)}
            </div>

            <div className="manuscript-sheet p-4 space-y-2 text-xs font-manuscript">
              {currentDoc.relationshipWeb.map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="py-1.5 border-b border-[var(--ink-soft)]/40 flex items-baseline justify-between"
                >
                  <InlineEditableField
                    value={
                      w.fields.relation ||
                      `${w.fields.source || "Entity"} → ${w.fields.target || "Entity"}: ${
                        w.fields.bond || "Bond"
                      }`
                    }
                    onCommit={(val) =>
                      handleUpdateEntryField("relationshipWeb", w.id, "relation", val)
                    }
                  />
                  <span className="text-[10px] font-apparatus text-[var(--graphite)]">
                    {w.fields.pressure || ""}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 9. KNOWLEDGE MAP */}
          <section id="manuscript-sec-knowledgeMap" className="space-y-4">
            <div className="scribe-header">
              <span>Knowledge Map</span>
              {renderSectionControls("knowledgeMap", `${currentDoc.knowledgeMap.length} nodes · [C]`)}
            </div>

            <div className="space-y-3 font-manuscript text-xs">
              {currentDoc.knowledgeMap.map((k, idx) => (
                <div key={k.id || idx} className="p-3 manuscript-sheet space-y-1.5">
                  <strong className="font-semibold text-sm text-[var(--ink)] block">
                    Truth: {k.fields.truth}
                  </strong>
                  <p className="text-[var(--graphite)]">
                    <strong>Knows:</strong> {k.fields.knows} · <strong>Suspects:</strong> {k.fields.suspects}
                  </p>
                  <p className="italic text-[var(--rubric)]">
                    Surfaces when: {k.fields.surfacesWhen}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 10. ITEM & ABILITY SEEDS */}
          <section id="manuscript-sec-items" className="space-y-4">
            <div className="scribe-header">
              <span>Item & Ability Seeds</span>
              {renderSectionControls("items", `${currentDoc.items.length} items · [C]`)}
            </div>

            <div className="space-y-3 font-manuscript text-xs">
              {currentDoc.items.map((item) => (
                <div key={item.id} className="p-3 manuscript-sheet space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-sm text-[var(--ink)]">{item.fields.name}</h4>
                    <span className="lore-key-tag">KEYS: {item.keys.join(", ")}</span>
                  </div>
                  <p><strong>Effect:</strong> {item.fields.whatItDoes}</p>
                  <p><strong>Cost / Limit:</strong> {item.fields.costOrLimit}</p>
                  <p className="italic text-[var(--rubric)]">
                    Unfired Gun: {item.fields.unfiredGun}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 11. SECRET SEEDS */}
          <section id="manuscript-sec-secrets" className="space-y-4">
            <div className="scribe-header">
              <span>Secret Seeds</span>
              {renderSectionControls("secrets", `${currentDoc.secrets.length} secrets · [C]`)}
            </div>

            <div className="space-y-3 font-manuscript text-xs">
              {currentDoc.secrets.map((s) => (
                <div key={s.id} className="p-3.5 manuscript-sheet space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-sm text-[var(--ink)]">Truth: {s.fields.truth}</h4>
                    <span className="lore-key-tag">KEYS: {s.keys.join(", ")}</span>
                  </div>
                  <p><strong>Who Keeps It:</strong> {s.fields.whoKeepsIt} · <strong>How:</strong> {s.fields.howKept}</p>
                  <p><strong>Trigger:</strong> {s.fields.discoveryTrigger}</p>
                  <p className="italic text-[var(--rubric)]">
                    Changes World: {s.fields.whatItChanges}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 12. CONFLICT ARCHITECTURE */}
          <section id="manuscript-sec-conflict" className="space-y-4">
            <div className="scribe-header">
              <span>Conflict Architecture</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">P · Constant</span>
            </div>

            <div className="manuscript-sheet p-5 space-y-3 text-xs font-manuscript">
              <InlineEditableField
                label="Central Conflict"
                value={currentDoc.conflict.central}
                onCommit={(val) =>
                  pushDocMutation({
                    ...currentDoc,
                    conflict: { ...currentDoc.conflict, central: val },
                  })
                }
                multiline
              />
              <InlineEditableField
                label="Opposition"
                value={currentDoc.conflict.opposition}
                onCommit={(val) =>
                  pushDocMutation({
                    ...currentDoc,
                    conflict: { ...currentDoc.conflict, opposition: val },
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <InlineEditableField
                  label="Stakes If Bad"
                  value={currentDoc.conflict.stakesBad}
                  onCommit={(val) =>
                    pushDocMutation({
                      ...currentDoc,
                      conflict: { ...currentDoc.conflict, stakesBad: val },
                    })
                  }
                />
                <InlineEditableField
                  label="Stakes Acceptable"
                  value={currentDoc.conflict.stakesAcceptable}
                  onCommit={(val) =>
                    pushDocMutation({
                      ...currentDoc,
                      conflict: { ...currentDoc.conflict, stakesAcceptable: val },
                    })
                  }
                />
              </div>
              <InlineEditableField
                label="Countdown Clock"
                value={currentDoc.conflict.clock}
                onCommit={(val) =>
                  pushDocMutation({
                    ...currentDoc,
                    conflict: { ...currentDoc.conflict, clock: val },
                  })
                }
              />
            </div>
          </section>

          {/* 13. PROCEDURAL ROLLS (ANTI-POSITIVE BIAS) */}
          <section id="manuscript-sec-proceduralRolls" className="space-y-4">
            <div className="scribe-header flex items-center justify-between">
              <span>Procedural Roll Groups (Anti-Positive Bias)</span>
              <button
                type="button"
                onClick={() => setCenterTab("proceduralRolls")}
                className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--gold)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Dice5 size={11} />
                <span>Open Dedicated Roll Builder →</span>
              </button>
            </div>

            <div className="manuscript-sheet p-6 space-y-4 font-manuscript">
              {(!currentDoc.proceduralRolls || currentDoc.proceduralRolls.length === 0) ? (
                <div className="text-center py-4 text-xs font-manuscript text-[var(--graphite)]">
                  <p>No procedural roll groups forged yet.</p>
                  <button
                    type="button"
                    onClick={() => setCenterTab("proceduralRolls")}
                    className="mt-2 text-xs font-apparatus uppercase tracking-wider text-[var(--rubric)] hover:underline"
                  >
                    Forge Procedural Dice Groups →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDoc.proceduralRolls.map((grp) => (
                    <div
                      key={grp.id}
                      className="p-3.5 rounded-[2px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-apparatus">
                        <span className="font-bold text-[var(--ink)]">{grp.name}</span>
                        <span className="font-mono-ui text-[10px] text-[var(--graphite)]">
                          {(grp.triggerKeys || []).join(", ")}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-manuscript text-[11px]">
                        {grp.entries.map((e, eIdx) => (
                          <div key={e.id} className="p-2 rounded bg-[var(--vellum)] border border-[var(--ink-soft)]">
                            <span className="font-mono-ui font-semibold text-[var(--rubric)] block text-[10px]">
                              #{eIdx + 1} ({e.weight}%)
                            </span>
                            <p className="line-clamp-2 italic text-[var(--graphite)]">{e.outcome}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 14. OPENING SCENE */}
          <section id="manuscript-sec-opening" className="space-y-4">
            <div className="scribe-header flex items-center justify-between">
              <span>Opening Scene & First Message</span>
              <button
                type="button"
                onClick={() => setCenterTab("testBench")}
                className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--rubric)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileSearch size={11} />
                <span>Audit Cardinal Sins in Test Bench →</span>
              </button>
            </div>

            <div className="manuscript-sheet p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-apparatus text-[var(--graphite)] pb-3 border-b border-[var(--ink-soft)]">
                <p><strong>First Location:</strong> {currentDoc.opening.firstLocation}</p>
                <p><strong>First NPC:</strong> {currentDoc.opening.firstNpc}</p>
                <p><strong>First Choice:</strong> {currentDoc.opening.firstChoice}</p>
              </div>

              <div>
                <span className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--rubric)] block mb-2 font-semibold">
                  First Message (Mid-motion style sample)
                </span>
                <div className="font-manuscript text-[16px] leading-[1.75] text-[var(--ink)] whitespace-pre-line border-l-2 border-[var(--rubric)] pl-4">
                  <InlineEditableField
                    value={currentDoc.opening.firstMessage}
                    onCommit={(val) =>
                      pushDocMutation({
                        ...currentDoc,
                        opening: { ...currentDoc.opening, firstMessage: val },
                      })
                    }
                    multiline
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 15. ANTI-GRAVITY NOTES */}
          <section id="manuscript-sec-antiGravity" className="space-y-4">
            <div className="scribe-header">
              <span>Anti-Gravity Notes (Model Counters)</span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">P · Constant</span>
            </div>

            <div className="space-y-3 font-manuscript text-xs text-[var(--ink)]">
              {currentDoc.antiGravity.temptations.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px]"
                >
                  <strong className="text-[var(--rubric)] font-apparatus text-[10px] uppercase block mb-0.5">
                    {t.temptation}
                  </strong>
                  <p className="text-[var(--ink)] leading-snug">{t.counter}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Folio / Token Counter Margin Detail */}
          <footer className="mt-12 pt-4 border-t border-[var(--ink-soft)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono-ui text-[var(--graphite)] select-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-apparatus uppercase tracking-widest text-[10px] text-[var(--rubric)] font-semibold">
                § Folio 1
              </span>
              <span>·</span>
              <span>~{liveStats.words.toLocaleString()} words</span>
              <span>·</span>
              <span>~{liveStats.tokens.toLocaleString()} tokens</span>
              <span>·</span>
              <span className="hidden sm:inline">
                {allEntriesList.length} indexed entries
              </span>
            </div>
            <div className="font-hand text-base text-[var(--ink)]">
              Last inked {lastSavedFormatted}
            </div>
          </footer>
        </div>
      )}
    </main>

        {/* RIGHT COLUMN: The Annotation Margin doubling as Context Inspector (3 cols on lg) */}
        <aside className="lg:col-span-3 sticky top-16 max-h-[85vh] overflow-y-auto pl-2 border-l border-[var(--ink-soft)]/50">
          <MarginInspector
            document={currentDoc}
            selectedEntry={currentSelectedEntry}
            selectedSectionKey={selectedSectionKey}
            selectedSectionTitle={
              selectedSectionKey ? selectedSectionKey.toUpperCase() : undefined
            }
            findingsForSelected={findingsForSelected}
            allFindings={findings}
            onApplyFindingFix={handleApplyFindingFix}
            onDismissFinding={handleDismissFinding}
            onToggleLock={handleToggleLock}
            onRerollEntry={handleRerollEntry}
            isRerollingEntry={isRerollingEntry}
            onFetchVariants={handleFetchVariants}
            variants={variants}
            isLoadingVariants={isLoadingVariants}
            onPickVariant={handlePickVariant}
            onDismissVariants={clearVariants}
            onPushEntry={handlePushEntry}
            isPushingEntry={isPushingEntry}
            onSaveMarginNote={handleSaveMarginNote}
            onDuplicateEntry={handleDuplicateEntry}
            onDeleteEntry={handleDeleteEntry}
            rippleNotice={rippleNotice}
            onRegenerateRippleReferences={handleRegenerateRippleReferences}
            onCloseSelection={() => {
              setSelectedEntryId(null);
              setSelectedSectionKey(null);
            }}
          />
        </aside>
      </div>
    </div>
  );
};
