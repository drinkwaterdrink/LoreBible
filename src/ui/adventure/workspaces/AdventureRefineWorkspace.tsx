import React, { useState } from "react";
import type {
  ConsistencyFinding,
  Entry,
  LoreBibleDocument,
  GenerationSettings,
  VariantSlip,
} from "../../../types";
import { useRefineController } from "../../../hooks/useRefineController";
import { InlineEditableField } from "../../../components/refine/InlineEditableField";
import { RelationshipWeb } from "../../../components/visual/RelationshipWeb";
import { PressureMap } from "../../../components/visual/PressureMap";
import {
  BookOpen,
  Layers,
  Network,
  CheckCircle2,
  Undo2,
  Redo2,
  Download,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  MoreVertical,
  Plus,
  Trash2,
  Copy,
  FileEdit,
  X,
  Compass,
  AlertTriangle,
  Menu,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
  Dice5,
  Eye,
} from "lucide-react";

export type RefinePresentationMode = "MANUSCRIPT" | "WORLD" | "RELATIONSHIPS" | "QA";

export interface AdventureRefineWorkspaceProps {
  document: LoreBibleDocument;
  onUpdateDocument: (updated: LoreBibleDocument) => void;
  onOpenExport: () => void;
  settings: GenerationSettings;
  onOpenConnections: () => void;
  initialPresentationMode?: RefinePresentationMode;
  initialSelectedSectionKey?: string | null;
  initialSelectedEntryId?: string | null;
}

export const AdventureRefineWorkspace: React.FC<AdventureRefineWorkspaceProps> = ({
  document,
  onUpdateDocument,
  onOpenExport,
  settings,
  onOpenConnections: _onOpenConnections,
  initialPresentationMode = "MANUSCRIPT",
  initialSelectedSectionKey = null,
  initialSelectedEntryId = null,
}) => {
  const [presentationMode, setPresentationMode] = useState<RefinePresentationMode>(initialPresentationMode);
  const [worldCategoryFilter, setWorldCategoryFilter] = useState<string>("all");
  const [isContentsDrawerOpen, setIsContentsDrawerOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPushInputOpen, setIsPushInputOpen] = useState(false);
  const [pushInstruction, setPushInstruction] = useState("");
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const controller = useRefineController({
    document,
    onUpdateDocument,
    settings,
    enableKeyboardShortcuts: true,
    initialSelectedSectionKey,
    initialSelectedEntryId,
  });

  const {
    currentDoc,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    pushDocMutation,
    selectedEntryId,
    selectedSectionKey,
    selectEntry,
    deselectEntry,
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
    dismissRippleNotice,
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
    handleUpdateEntryField,
    handleUpdateCoreField,
    handleUpdateUserField,
    operationError,
    setOperationError,
    allEntriesList,
    liveStats,
    lastSavedFormatted,
  } = controller;

  const scrollToSection = (secId: string) => {
    setIsContentsDrawerOpen(false);
    if (presentationMode !== "MANUSCRIPT") {
      setPresentationMode("MANUSCRIPT");
    }
    setTimeout(() => {
      const el = window.document.getElementById(`adv-sec-${secId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const unresolvedFindings = findings.filter((f) => !f.applied && !f.dismissed);

  return (
    <div id="adventure-refine-workspace" className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5 pb-36 text-[var(--ink)]">
      {/* 1. Refine Command Header */}
      <header className="border-b border-[var(--ink-soft)] pb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-ui uppercase tracking-widest text-[var(--gold)] font-bold px-2 py-0.5 rounded bg-[var(--vellum-raised)] border border-[var(--ink-soft)]">
              Stage 05 · Refine Studio
            </span>
            <span className="text-[11px] font-mono-ui text-[var(--graphite)]">
              Saved {lastSavedFormatted}
            </span>
          </div>

          {/* Stats & Actions Toolbar */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-ui px-2 py-0.5 rounded bg-[var(--vellum-raised)] border border-[var(--ink-soft)] text-[var(--graphite)] hidden sm:inline-block">
              {liveStats.words.toLocaleString()} words · {liveStats.tokens.toLocaleString()} tokens
            </span>

            {/* Undo / Redo Cluster */}
            <div className="inline-flex border border-[var(--ink-soft)] rounded-[3px] overflow-hidden bg-[var(--vellum-raised)]">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="px-2.5 py-1 text-xs text-[var(--ink)] hover:bg-[var(--vellum)] border-r border-[var(--ink-soft)] disabled:opacity-30 cursor-pointer transition-colors"
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="px-2.5 py-1 text-xs text-[var(--ink)] hover:bg-[var(--vellum)] disabled:opacity-30 cursor-pointer transition-colors"
              >
                <Redo2 size={13} />
              </button>
            </div>

            {/* Export Trigger */}
            <button
              id="refine-export-btn"
              type="button"
              onClick={onOpenExport}
              className="px-3 py-1 text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--ink)] hover:text-[var(--gold)] bg-[var(--vellum-raised)] rounded border border-[var(--ink-soft)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Title and TOC Trigger */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-manuscript font-semibold tracking-tight text-[var(--ink)] truncate">
            {currentDoc.core?.title || currentDoc.title || "The Manuscript"}
          </h1>

          <button
            type="button"
            onClick={() => setIsContentsDrawerOpen(true)}
            className="shrink-0 text-xs font-apparatus text-[var(--graphite)] hover:text-[var(--ink)] flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--vellum-raised)] border border-[var(--ink-soft)] cursor-pointer"
          >
            <Menu size={13} />
            <span>Contents</span>
          </button>
        </div>
      </header>

      {/* 2. Presentation Mode Selector Bar */}
      <nav
        aria-label="Refine presentation modes"
        className="flex items-center gap-1 p-1 bg-[var(--vellum-raised)] rounded-[4px] border border-[var(--ink-soft)] overflow-x-auto scrollbar-none"
      >
        <button
          type="button"
          onClick={() => setPresentationMode("MANUSCRIPT")}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-[3px] text-xs font-apparatus font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            presentationMode === "MANUSCRIPT"
              ? "bg-[var(--vellum)] text-[var(--ink)] shadow-xs border border-[var(--gold)]/50"
              : "text-[var(--graphite)] hover:text-[var(--ink)]"
          }`}
        >
          <BookOpen size={13} />
          <span>Manuscript</span>
        </button>

        <button
          type="button"
          onClick={() => setPresentationMode("WORLD")}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-[3px] text-xs font-apparatus font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            presentationMode === "WORLD"
              ? "bg-[var(--vellum)] text-[var(--ink)] shadow-xs border border-[var(--gold)]/50"
              : "text-[var(--graphite)] hover:text-[var(--ink)]"
          }`}
        >
          <Layers size={13} />
          <span>World Cards</span>
        </button>

        <button
          type="button"
          onClick={() => setPresentationMode("RELATIONSHIPS")}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-[3px] text-xs font-apparatus font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            presentationMode === "RELATIONSHIPS"
              ? "bg-[var(--vellum)] text-[var(--ink)] shadow-xs border border-[var(--gold)]/50"
              : "text-[var(--graphite)] hover:text-[var(--ink)]"
          }`}
        >
          <Network size={13} />
          <span>Relationships</span>
        </button>

        <button
          type="button"
          onClick={() => setPresentationMode("QA")}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-[3px] text-xs font-apparatus font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            presentationMode === "QA"
              ? "bg-[var(--vellum)] text-[var(--ink)] shadow-xs border border-[var(--gold)]/50"
              : "text-[var(--graphite)] hover:text-[var(--ink)]"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>Consistency QA</span>
          {unresolvedFindings.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono-ui font-bold bg-amber-900/80 text-amber-200">
              {unresolvedFindings.length}
            </span>
          )}
        </button>
      </nav>

      {/* 3. Ripple Cross-Reference Alert (if triggered) */}
      {rippleNotice && (
        <section
          role="alert"
          className="p-3.5 rounded-[4px] bg-amber-950/40 border border-amber-800/80 text-amber-200 space-y-2 text-xs font-manuscript animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="font-apparatus font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Compass size={14} className="text-amber-400" />
              Cross-Reference Notice: “{rippleNotice.sourceName}”
            </span>
            <button
              type="button"
              onClick={dismissRippleNotice}
              className="text-amber-400 hover:text-amber-200 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-100">
            Modifications to {rippleNotice.sourceName} affect {rippleNotice.references.length} other entries in your scenario.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleRegenerateRippleReferences(rippleNotice)}
              className="px-3 py-1 text-xs font-mono-ui font-semibold bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded border border-amber-700/80 transition-colors cursor-pointer"
            >
              Align {rippleNotice.references.length} mentions with AI
            </button>
          </div>
        </section>
      )}

      {/* 4. Presentation Mode Views */}

      {/* MODE 1: MANUSCRIPT VIEW */}
      {presentationMode === "MANUSCRIPT" && (
        <main className="space-y-6">
          {/* Section 1: Core Scenario Foundations */}
          <section id="adv-sec-core" className="space-y-4">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Core Scenario Foundations
              </span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">[P] Permanent</span>
            </div>

            <div className="manuscript-sheet p-5 space-y-4 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[4px]">
              <div>
                <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
                  Title & Pitch
                </label>
                <InlineEditableField
                  value={currentDoc.core?.pitch || ""}
                  onCommit={(val) => handleUpdateCoreField("pitch", val)}
                  multiline
                  className="italic text-base leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--ink-soft)]/50">
                <div>
                  <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
                    The Rule
                  </label>
                  <InlineEditableField
                    value={currentDoc.core?.theRule || ""}
                    onCommit={(val) => handleUpdateCoreField("theRule", val)}
                    multiline
                  />
                </div>
                <div>
                  <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
                    The Cost
                  </label>
                  <InlineEditableField
                    value={currentDoc.core?.theCost || ""}
                    onCommit={(val) => handleUpdateCoreField("theCost", val)}
                    multiline
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--ink-soft)]/50">
                <div>
                  <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
                    The Situation
                  </label>
                  <InlineEditableField
                    value={currentDoc.core?.theSituation || ""}
                    onCommit={(val) => handleUpdateCoreField("theSituation", val)}
                    multiline
                  />
                </div>
                <div>
                  <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
                    The Pressure
                  </label>
                  <InlineEditableField
                    value={currentDoc.core?.thePressure || ""}
                    onCommit={(val) => handleUpdateCoreField("thePressure", val)}
                    multiline
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Protagonist Role */}
          <section id="adv-sec-user" className="space-y-4">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Protagonist Hierarchy & Position
              </span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">[P] Permanent</span>
            </div>

            <div className="manuscript-sheet p-5 space-y-3 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[4px] text-xs font-manuscript">
              <div>
                <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                  Position & Standing
                </label>
                <InlineEditableField
                  value={currentDoc.user?.rolePosition || ""}
                  onCommit={(val) => handleUpdateUserField("rolePosition", val)}
                />
              </div>

              <div>
                <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                  Starts With
                </label>
                <InlineEditableField
                  value={currentDoc.user?.startsWith || ""}
                  onCommit={(val) => handleUpdateUserField("startsWith", val)}
                  multiline
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--ink-soft)]/40">
                <div>
                  <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                    Wants
                  </label>
                  <InlineEditableField
                    value={currentDoc.user?.wants || ""}
                    onCommit={(val) => handleUpdateUserField("wants", val)}
                    multiline
                  />
                </div>
                <div>
                  <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                    Fears
                  </label>
                  <InlineEditableField
                    value={currentDoc.user?.fears || ""}
                    onCommit={(val) => handleUpdateUserField("fears", val)}
                    multiline
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Locations */}
          <section id="adv-sec-locations" className="space-y-3">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Locations & Thresholds ({currentDoc.locations?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => controller.handleRegenerateSection("locations", 1)}
                className="text-[10px] font-mono-ui text-[var(--gold)] hover:underline cursor-pointer"
              >
                + Add Location
              </button>
            </div>

            <div className="space-y-3">
              {(currentDoc.locations || []).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => selectEntry("locations", loc.id)}
                  className={`manuscript-sheet p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 ${
                    selectedEntryId === loc.id
                      ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                      : "bg-[var(--vellum-raised)] border-[var(--ink-soft)] hover:border-[var(--gold)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)]">
                      {loc.fields.name || "Untitled Location"}
                    </h3>
                    <div className="flex items-center gap-2">
                      {loc.locked && <Lock size={12} className="text-[var(--gold)]" />}
                      {loc.note && (
                        <span className="text-[10px] font-mono-ui bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded">
                          Note
                        </span>
                      )}
                    </div>
                  </div>
                  <InlineEditableField
                    value={loc.fields.truth || loc.fields.function || ""}
                    onCommit={(val) => handleUpdateEntryField("locations", loc.id, "truth", val)}
                    multiline
                    className="text-xs text-[var(--graphite)] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Factions */}
          <section id="adv-sec-factions" className="space-y-3">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Factions & Sovereign Orders ({currentDoc.factions?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => controller.handleRegenerateSection("factions", 1)}
                className="text-[10px] font-mono-ui text-[var(--gold)] hover:underline cursor-pointer"
              >
                + Add Faction
              </button>
            </div>

            <div className="space-y-3">
              {(currentDoc.factions || []).map((fac) => (
                <div
                  key={fac.id}
                  onClick={() => selectEntry("factions", fac.id)}
                  className={`manuscript-sheet p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 ${
                    selectedEntryId === fac.id
                      ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                      : "bg-[var(--vellum-raised)] border-[var(--ink-soft)] hover:border-[var(--gold)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)]">
                      {fac.fields.name || "Untitled Faction"}
                    </h3>
                    {fac.locked && <Lock size={12} className="text-[var(--gold)]" />}
                  </div>
                  <InlineEditableField
                    value={fac.fields.truth || fac.fields.publicFace || ""}
                    onCommit={(val) => handleUpdateEntryField("factions", fac.id, "truth", val)}
                    multiline
                    className="text-xs text-[var(--graphite)] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Dramatis Personae (NPCs) */}
          <section id="adv-sec-npcs" className="space-y-3">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Dramatis Personae ({currentDoc.npcs?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => controller.handleRegenerateSection("npcs", 1)}
                className="text-[10px] font-mono-ui text-[var(--gold)] hover:underline cursor-pointer"
              >
                + Add Character
              </button>
            </div>

            <div className="space-y-3">
              {(currentDoc.npcs || []).map((npc) => (
                <div
                  key={npc.id}
                  onClick={() => selectEntry("npcs", npc.id)}
                  className={`manuscript-sheet p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 ${
                    selectedEntryId === npc.id
                      ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                      : "bg-[var(--vellum-raised)] border-[var(--ink-soft)] hover:border-[var(--gold)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)]">
                        {npc.fields.name || "Unnamed Figure"}
                      </h3>
                      {npc.fields.role && (
                        <span className="text-[11px] font-mono-ui text-[var(--graphite)]">
                          {npc.fields.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {npc.locked && <Lock size={12} className="text-[var(--gold)]" />}
                      {npc.note && (
                        <span className="text-[10px] font-mono-ui bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded">
                          Note
                        </span>
                      )}
                    </div>
                  </div>
                  <InlineEditableField
                    value={npc.fields.truth || npc.fields.wants || ""}
                    onCommit={(val) => handleUpdateEntryField("npcs", npc.id, "truth", val)}
                    multiline
                    className="text-xs text-[var(--graphite)] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Relics & Secrets */}
          <section id="adv-sec-secrets" className="space-y-3">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Relics & Latent Secrets ({(currentDoc.items?.length || 0) + (currentDoc.secrets?.length || 0)})
              </span>
            </div>

            <div className="space-y-3">
              {(currentDoc.items || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectEntry("items", item.id)}
                  className={`manuscript-sheet p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 ${
                    selectedEntryId === item.id
                      ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                      : "bg-[var(--vellum-raised)] border-[var(--ink-soft)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif-title font-semibold text-xs text-[var(--ink)]">
                      Relic: {item.fields.name || item.id}
                    </span>
                    {item.locked && <Lock size={12} className="text-[var(--gold)]" />}
                  </div>
                  <InlineEditableField
                    value={item.fields.truth || item.fields.whatItDoes || ""}
                    onCommit={(val) => handleUpdateEntryField("items", item.id, "truth", val)}
                    multiline
                    className="text-xs text-[var(--graphite)]"
                  />
                </div>
              ))}

              {(currentDoc.secrets || []).map((sec) => (
                <div
                  key={sec.id}
                  onClick={() => selectEntry("secrets", sec.id)}
                  className={`manuscript-sheet p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 ${
                    selectedEntryId === sec.id
                      ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                      : "bg-[var(--vellum-raised)] border-[var(--ink-soft)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif-title font-semibold text-xs text-amber-400">
                      Secret Covenant
                    </span>
                    {sec.locked && <Lock size={12} className="text-[var(--gold)]" />}
                  </div>
                  <InlineEditableField
                    value={sec.fields.truth || ""}
                    onCommit={(val) => handleUpdateEntryField("secrets", sec.id, "truth", val)}
                    multiline
                    className="text-xs text-[var(--graphite)]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Narrative Opening Crawl */}
          <section id="adv-sec-opening" className="space-y-4">
            <div className="scribe-header flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
              <span className="font-apparatus text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Narrative Opening & First Choice
              </span>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">[T] Transient</span>
            </div>

            <div className="manuscript-sheet p-5 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[4px] space-y-3">
              <div>
                <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                  First Message / Entry Atmosphere
                </label>
                <InlineEditableField
                  value={currentDoc.opening?.firstMessage || ""}
                  onCommit={(val) => {
                    pushDocMutation({
                      ...currentDoc,
                      opening: {
                        ...currentDoc.opening,
                        firstMessage: val,
                      },
                    });
                  }}
                  multiline
                  className="text-sm font-manuscript leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-[var(--ink-soft)]/50">
                <label className="text-[10px] font-apparatus uppercase text-[var(--graphite)] block mb-1">
                  First Choice Prompt
                </label>
                <InlineEditableField
                  value={currentDoc.opening?.firstChoice || ""}
                  onCommit={(val) => {
                    pushDocMutation({
                      ...currentDoc,
                      opening: {
                        ...currentDoc.opening,
                        firstChoice: val,
                      },
                    });
                  }}
                  multiline
                  className="text-xs font-manuscript text-[var(--graphite)] italic"
                />
              </div>
            </div>
          </section>
        </main>
      )}

      {/* MODE 2: WORLD CARDS VIEW */}
      {presentationMode === "WORLD" && (
        <section className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[var(--ink-soft)]">
            {[
              { id: "all", label: "All Entries" },
              { id: "locations", label: "Locations" },
              { id: "factions", label: "Factions" },
              { id: "npcs", label: "Characters" },
              { id: "items", label: "Relics & Items" },
              { id: "secrets", label: "Secrets" },
              { id: "pressures", label: "Pressures" },
              { id: "history", label: "History" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setWorldCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-[3px] text-xs font-mono-ui transition-colors cursor-pointer ${
                  worldCategoryFilter === cat.id
                    ? "bg-[var(--gold)] text-[var(--vellum)] font-bold"
                    : "bg-[var(--vellum-raised)] border border-[var(--ink-soft)] text-[var(--graphite)] hover:text-[var(--ink)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allEntriesList
              .filter((item) => worldCategoryFilter === "all" || item.sectionKey === worldCategoryFilter)
              .map((item) => {
                const entry = item.entry;
                const name = entry.fields.name || entry.fields.truth || entry.fields.event || entry.id;
                const isSelected = selectedEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    onClick={() => selectEntry(item.sectionKey, entry.id)}
                    className={`p-4 rounded-[4px] border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-950/20 border-[var(--gold)] shadow-xs"
                        : "bg-[var(--vellum-raised)] border-[var(--ink-soft)] hover:border-[var(--gold)]/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono-ui uppercase tracking-wider text-[var(--gold)] font-semibold">
                          {item.sectionKey}
                        </span>
                        {entry.locked && <Lock size={12} className="text-[var(--gold)]" />}
                      </div>
                      <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)] line-clamp-1">
                        {name}
                      </h3>
                      <p className="text-xs font-manuscript text-[var(--graphite)] line-clamp-3 leading-snug">
                        {entry.fields.truth || entry.fields.function || entry.fields.wants || entry.fields.force || ""}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--ink-soft)]/40 flex items-center justify-between text-[10px] font-mono-ui text-[var(--graphite)]">
                      <span>{entry.keys?.length ? `${entry.keys.length} keys` : "Core seed"}</span>
                      <span className="text-[var(--gold)] font-semibold">Inspect →</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* MODE 3: RELATIONSHIPS VIEW */}
      {presentationMode === "RELATIONSHIPS" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-soft)] pb-2">
            <div>
              <h2 className="text-sm font-apparatus font-bold uppercase tracking-wider text-[var(--ink)]">
                Social Fabric & Cast Bonds
              </h2>
              <p className="text-xs font-manuscript text-[var(--graphite)]">
                Bonds, pressures, and transactional allegiances between agents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGraphModalOpen(true)}
              className="px-3 py-1.5 text-xs font-mono-ui font-semibold bg-[var(--vellum-raised)] hover:bg-[var(--vellum)] text-[var(--ink)] rounded border border-[var(--ink-soft)] flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Maximize2 size={13} />
              <span>Open Interactive Graph Modal</span>
            </button>
          </div>

          {/* Mobile-safe Relationship List Summary */}
          <div className="space-y-3">
            {(currentDoc.npcs || []).map((npc) => {
              const rels = (currentDoc.relationshipWeb || []).filter(
                (r) =>
                  r.fields.source === npc.fields.name ||
                  r.fields.target === npc.fields.name ||
                  r.fields.source === npc.id ||
                  r.fields.target === npc.id
              );

              return (
                <div
                  key={npc.id}
                  className="p-4 rounded-[4px] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)]">
                        {npc.fields.name}
                      </h3>
                      <span className="text-[11px] font-manuscript text-[var(--graphite)]">
                        {npc.fields.role || "Cast Member"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectEntry("npcs", npc.id)}
                      className="text-[10px] font-mono-ui text-[var(--gold)] hover:underline cursor-pointer"
                    >
                      Select Figure
                    </button>
                  </div>

                  {rels.length === 0 ? (
                    <p className="text-xs font-manuscript text-[var(--graphite)] italic">
                      No explicit relationship ties inked yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 pl-2 border-l-2 border-[var(--gold)]/40">
                      {rels.map((r) => {
                        const peer =
                          r.fields.source === npc.fields.name || r.fields.source === npc.id
                            ? r.fields.target
                            : r.fields.source;

                        return (
                          <div key={r.id} className="text-xs font-manuscript text-[var(--ink)]">
                            <span className="font-semibold text-[var(--gold)]">↔ {peer}: </span>
                            <span>{r.fields.bond || r.fields.relation || "Linked"}</span>
                            {r.fields.pressure && (
                              <span className="text-[var(--graphite)] italic block text-[11px] pl-3">
                                Pressure: {r.fields.pressure}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MODE 4: CONSISTENCY QA VIEW */}
      {presentationMode === "QA" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-soft)] pb-2">
            <div>
              <h2 className="text-sm font-apparatus font-bold uppercase tracking-wider text-[var(--ink)]">
                Proofreader & Consistency Studio
              </h2>
              <p className="text-xs font-manuscript text-[var(--graphite)]">
                Automated detection of causal leaks, naming mismatches, and orphan lore.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={isAuditing ? "animate-spin" : ""} />
                <span>{isAuditing ? "Auditing..." : "Run Consistency Audit"}</span>
              </button>
              {unresolvedFindings.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFindings}
                  className="px-2.5 py-1 text-xs font-mono-ui text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
                >
                  Dismiss All
                </button>
              )}
            </div>
          </div>

          {unresolvedFindings.length === 0 ? (
            <div className="p-8 text-center bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[4px] space-y-2">
              <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
              <h3 className="font-serif-title font-semibold text-sm text-[var(--ink)]">
                No Consistency Conflicts Detected
              </h3>
              <p className="text-xs font-manuscript text-[var(--graphite)]">
                All names, rules, and cross-references appear causally grounded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unresolvedFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 rounded-[4px] bg-[var(--vellum-raised)] border border-amber-800/60 space-y-2 text-xs font-manuscript"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-ui uppercase font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                      {finding.type || "Consistency Warning"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissFinding(finding.id)}
                      className="text-[var(--graphite)] hover:text-[var(--ink)] text-[11px] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <p className="text-[var(--ink)] leading-relaxed">{finding.explanation}</p>

                  {finding.offendingText && (
                    <div className="p-2 rounded bg-[var(--vellum)] border border-[var(--ink-soft)]/50 text-[11px] space-y-1">
                      <div className="text-[var(--graphite)]">
                        <strong>Found:</strong> <span className="line-through">{finding.offendingText}</span>
                      </div>
                      {finding.suggestedFix && (
                        <div className="text-emerald-300">
                          <strong>Suggested:</strong> {finding.suggestedFix}
                        </div>
                      )}
                    </div>
                  )}

                  {finding.suggestedFix && (
                    <button
                      type="button"
                      onClick={() => handleApplyFindingFix(finding)}
                      className="px-3 py-1 text-xs font-mono-ui font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 rounded border border-emerald-800 transition-colors cursor-pointer"
                    >
                      Apply Suggested Fix
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Mobile Table of Contents Slide-over Drawer */}
      {isContentsDrawerOpen && (
        <div
          role="dialog"
          aria-label="Table of Contents"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in"
          onClick={() => setIsContentsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-[var(--vellum-raised)] h-full border-l border-[var(--ink-soft)] p-5 space-y-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-2">
              <span className="font-apparatus font-bold text-xs uppercase tracking-wider text-[var(--gold)]">
                Table of Contents
              </span>
              <button
                type="button"
                onClick={() => setIsContentsDrawerOpen(false)}
                className="p-1 text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1 font-manuscript text-xs">
              {[
                { id: "core", label: "Core Foundations" },
                { id: "user", label: "Protagonist Position" },
                { id: "locations", label: `Locations (${currentDoc.locations?.length || 0})` },
                { id: "factions", label: `Factions (${currentDoc.factions?.length || 0})` },
                { id: "npcs", label: `Dramatis Personae (${currentDoc.npcs?.length || 0})` },
                { id: "secrets", label: "Relics & Secrets" },
                { id: "opening", label: "Opening Crawl" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="w-full text-left p-2 rounded hover:bg-[var(--vellum)] text-[var(--ink)] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="text-[var(--graphite)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Full-Screen Relationship Graph Modal */}
      {isGraphModalOpen && (
        <div
          role="dialog"
          aria-label="Relationship Graph Modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex flex-col justify-center animate-fade-in"
          onClick={() => setIsGraphModalOpen(false)}
        >
          <div
            className="w-full h-full max-w-6xl max-h-[90vh] mx-auto bg-[var(--surface-app)] rounded-lg border border-[var(--ink-soft)] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[var(--vellum-raised)] border-b border-[var(--ink-soft)] flex items-center justify-between">
              <span className="font-apparatus font-bold text-xs uppercase tracking-wider text-[var(--gold)] flex items-center gap-1.5">
                <Network size={14} />
                Interactive Relationship Web Canvas
              </span>
              <button
                type="button"
                onClick={() => setIsGraphModalOpen(false)}
                className="p-1 text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Close Graph Modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden bg-neutral-950">
              <RelationshipWeb
                document={currentDoc}
                onUpdateDocument={pushDocMutation}
                onSelectNpcEntry={(npcId) => {
                  selectEntry("npcs", npcId);
                  setIsGraphModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Contextual Entry Dock (Fixed bottom panel when entry is selected) */}
      {currentSelectedEntry && selectedSectionKey && (
        <aside
          role="region"
          aria-label="Contextual Entry Actions"
          className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-[var(--vellum-raised)] border-t border-[var(--gold)]/60 shadow-2xl z-40 animate-slide-up"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Entry Summary */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[10px] font-mono-ui uppercase font-bold text-[var(--gold)] px-2 py-0.5 rounded bg-[var(--vellum)] border border-[var(--ink-soft)] shrink-0">
                {selectedSectionKey}
              </span>
              <span className="font-serif-title font-semibold text-sm text-[var(--ink)] truncate">
                {currentSelectedEntry.fields.name || currentSelectedEntry.fields.truth || currentSelectedEntry.id}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Lock Toggle */}
              <button
                type="button"
                onClick={() => handleToggleLock(selectedSectionKey, currentSelectedEntry.id)}
                className={`p-2 rounded text-xs transition-colors cursor-pointer border ${
                  currentSelectedEntry.locked
                    ? "bg-amber-950/60 text-[var(--gold)] border-[var(--gold)]"
                    : "bg-[var(--vellum)] text-[var(--graphite)] border-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
                title={currentSelectedEntry.locked ? "Locked against AI changes" : "Lock entry"}
              >
                {currentSelectedEntry.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>

              {/* Reroll Entry */}
              <button
                type="button"
                disabled={isRerollingEntry}
                onClick={() => handleRerollEntry(selectedSectionKey, currentSelectedEntry.id)}
                className="px-3 py-1.5 text-xs font-apparatus font-semibold uppercase tracking-wider bg-[var(--vellum)] hover:bg-[var(--vellum-raised)] text-[var(--ink)] rounded border border-[var(--ink-soft)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isRerollingEntry ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Reroll</span>
              </button>

              {/* More Actions Popup Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="px-2.5 py-1.5 text-xs font-mono-ui bg-[var(--vellum)] hover:bg-[var(--vellum-raised)] text-[var(--ink)] rounded border border-[var(--ink-soft)] transition-colors flex items-center gap-1 cursor-pointer"
                  aria-label="More entry operations"
                >
                  <MoreVertical size={13} />
                  <span>More</span>
                </button>

                {isMoreMenuOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded shadow-xl py-1 text-xs font-manuscript space-y-0.5 z-50 animate-fade-in"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => handleFetchVariants(selectedSectionKey, currentSelectedEntry.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles size={12} className="text-[var(--gold)]" />
                      <span>Generate 3 Variants</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPushInputOpen(true)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileEdit size={12} />
                      <span>Push Further with AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsNoteInputOpen(true)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileEdit size={12} />
                      <span>Add Margin Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateEntry(selectedSectionKey, currentSelectedEntry.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] flex items-center gap-2 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Duplicate Entry</span>
                    </button>

                    <div className="border-t border-[var(--ink-soft)] my-1" />

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(selectedSectionKey, currentSelectedEntry.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Delete Entry</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Close / Deselect */}
              <button
                type="button"
                onClick={deselectEntry}
                className="p-1.5 text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Close entry selection"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Inline Push Input Box */}
          {isPushInputOpen && (
            <div className="mt-2 pt-2 border-t border-[var(--ink-soft)]/50 flex items-center gap-2">
              <input
                type="text"
                value={pushInstruction}
                onChange={(e) => setPushInstruction(e.target.value)}
                placeholder="Give steer instructions (e.g. 'Make them colder and more secretive')..."
                className="flex-1 p-1.5 text-xs bg-[var(--vellum)] border border-[var(--ink-soft)] rounded outline-none"
              />
              <button
                type="button"
                disabled={isPushingEntry || !pushInstruction.trim()}
                onClick={() => {
                  handlePushEntry(selectedSectionKey, currentSelectedEntry.id, pushInstruction.trim());
                  setIsPushInputOpen(false);
                  setPushInstruction("");
                }}
                className="px-3 py-1.5 text-xs font-mono-ui font-semibold bg-[var(--gold)] text-[var(--vellum)] rounded disabled:opacity-50 cursor-pointer"
              >
                {isPushingEntry ? "Pushing..." : "Apply Push"}
              </button>
              <button
                type="button"
                onClick={() => setIsPushInputOpen(false)}
                className="text-xs text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Inline Margin Note Box */}
          {isNoteInputOpen && (
            <div className="mt-2 pt-2 border-t border-[var(--ink-soft)]/50 flex items-center gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type margin note..."
                className="flex-1 p-1.5 text-xs bg-[var(--vellum)] border border-[var(--ink-soft)] rounded outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  handleSaveMarginNote(selectedSectionKey, currentSelectedEntry.id, noteText, false);
                  setIsNoteInputOpen(false);
                  setNoteText("");
                }}
                className="px-3 py-1.5 text-xs font-mono-ui font-semibold bg-[var(--gold)] text-[var(--vellum)] rounded cursor-pointer"
              >
                Save Note
              </button>
              <button
                type="button"
                onClick={() => setIsNoteInputOpen(false)}
                className="text-xs text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </aside>
      )}

      {/* 8. Variants Slip Modal (when active) */}
      {variants && variants.length > 0 && selectedSectionKey && selectedEntryId && (
        <div
          role="dialog"
          aria-label="Variant Selection"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={clearVariants}
        >
          <div
            className="w-full max-w-2xl bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-2">
              <span className="font-apparatus font-bold text-xs uppercase tracking-wider text-[var(--gold)]">
                Choose Variant Slip (3 Generated Takes)
              </span>
              <button
                type="button"
                onClick={clearVariants}
                className="p-1 text-[var(--graphite)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-manuscript text-xs">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded bg-[var(--vellum)] border border-[var(--ink-soft)] space-y-2 hover:border-[var(--gold)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold font-serif-title text-sm text-[var(--ink)]">
                      {v.entry.fields.name || v.entry.fields.truth || `Variant ${idx + 1}`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handlePickVariant(selectedSectionKey, selectedEntryId, v)}
                      className="px-3 py-1 text-xs font-mono-ui font-semibold bg-[var(--gold)] text-[var(--vellum)] rounded hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Accept Variant
                    </button>
                  </div>
                  <p className="text-[var(--graphite)] leading-relaxed">
                    {v.entry.fields.truth || v.entry.fields.function || v.entry.fields.wants || ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
