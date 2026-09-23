import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type {
  ConsistencyFinding,
  Entry,
  LoreBibleDocument,
  RippleNotice,
  VariantSlip,
  GenerationSettings,
} from "../types";
import {
  auditConsistencyApi,
  fetchVariantsApi,
  pushEntryApi,
  regenerateSectionApi,
  rerollEntryApi,
} from "../services/geminiService";

export interface UseRefineControllerOptions {
  document: LoreBibleDocument;
  onUpdateDocument: (updated: LoreBibleDocument) => void;
  settings: GenerationSettings;
  enableKeyboardShortcuts?: boolean;
  initialSectionId?: string;
  initialSelectedEntryId?: string | null;
  initialSelectedSectionKey?: string | null;
}

export interface RefineController {
  // Document state & history
  currentDoc: LoreBibleDocument;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  pushDocMutation: (nextDoc: LoreBibleDocument) => void;

  // Selection
  activeSectionId: string;
  setActiveSectionId: (sectionId: string) => void;
  selectedEntryId: string | null;
  setSelectedEntryId: (entryId: string | null) => void;
  selectedSectionKey: string | null;
  setSelectedSectionKey: (sectionKey: string | null) => void;
  selectEntry: (sectionKey: string, entryId: string) => void;
  deselectEntry: () => void;
  currentSelectedEntry: Entry | null;

  // Consistency & Audit
  findings: ConsistencyFinding[];
  isAuditing: boolean;
  handleRunAudit: () => Promise<void>;
  handleApplyFindingFix: (finding: ConsistencyFinding) => void;
  handleDismissFinding: (findingId: string) => void;
  handleClearAllFindings: () => void;
  findingsForSelected: ConsistencyFinding[];

  // Cross-reference Ripples
  rippleNotice: RippleNotice | null;
  checkRipplesForName: (name: string, sourceEntryId: string) => RippleNotice | null;
  handleRegenerateRippleReferences: (notice: RippleNotice) => Promise<void>;
  dismissRippleNotice: () => void;

  // Entry Operations
  isRerollingEntry: boolean;
  handleRerollEntry: (sectionKey: string, entryId: string, instruction?: string) => Promise<void>;
  variants: VariantSlip[] | null;
  isLoadingVariants: boolean;
  handleFetchVariants: (sectionKey: string, entryId: string) => Promise<void>;
  handlePickVariant: (sectionKey: string, entryId: string, variant: VariantSlip) => void;
  clearVariants: () => void;
  isPushingEntry: boolean;
  handlePushEntry: (sectionKey: string, entryId: string, instruction: string) => Promise<void>;
  handleToggleLock: (sectionKey: string, entryId: string) => void;
  handleSaveMarginNote: (sectionKey: string, entryId: string, noteText: string, useAsInstruction: boolean) => void;
  handleDuplicateEntry: (sectionKey: string, entryId: string) => void;
  handleDeleteEntry: (sectionKey: string, entryId: string) => void;

  // Section & Field Mutations
  regeneratingSection: string | null;
  handleRegenerateSection: (sectionKey: string, addCount?: number) => Promise<void>;
  handleUpdateEntryField: (sectionKey: string, entryId: string, fieldKey: string, val: string) => void;
  handleUpdateCoreField: (fieldKey: string, val: string) => void;
  handleUpdateUserField: (fieldKey: string, val: string) => void;

  // Operational Errors
  operationError: string | null;
  setOperationError: (error: string | null) => void;

  // Derived Indexing & Statistics
  allEntriesList: { sectionKey: string; entry: Entry }[];
  liveStats: { words: number; tokens: number };
  lastSavedFormatted: string;
}

export function useRefineController({
  document,
  onUpdateDocument,
  settings,
  enableKeyboardShortcuts = true,
  initialSectionId = "core",
  initialSelectedEntryId = null,
  initialSelectedSectionKey = null,
}: UseRefineControllerOptions): RefineController {
  const [operationError, setOperationError] = useState<string | null>(null);

  // 1. History Stack for Undo / Redo
  const [history, setHistory] = useState<LoreBibleDocument[]>([document]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Version counter to prevent stale async callbacks from overwriting newer document state
  const docMutationVersionRef = useRef(0);
  const activeDocIdRef = useRef(document.id);

  // Reset history stack when document identity changes (e.g. project load/switch/restore)
  useEffect(() => {
    if (document.id !== activeDocIdRef.current) {
      activeDocIdRef.current = document.id;
      docMutationVersionRef.current += 1;
      setHistory([document]);
      setHistoryIndex(0);
      setRippleNotice(null);
      setVariants(null);
      setOperationError(null);
      setSelectedEntryId(null);
      setSelectedSectionKey(null);
      setActiveSectionId("core");
    }
  }, [document.id]);

  const currentDoc = history[historyIndex] || document;

  const pushDocMutation = useCallback(
    (newDoc: LoreBibleDocument) => {
      docMutationVersionRef.current += 1;
      const nextDoc: LoreBibleDocument = {
        ...newDoc,
        updatedAt: new Date().toISOString(),
      };
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        return [...truncated, nextDoc];
      });
      setHistoryIndex((prev) => prev + 1);
      onUpdateDocument(nextDoc);
    },
    [historyIndex, onUpdateDocument]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      docMutationVersionRef.current += 1;
      const prevDoc = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateDocument(prevDoc);
    }
  }, [historyIndex, history, onUpdateDocument]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      docMutationVersionRef.current += 1;
      const nextDoc = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateDocument(nextDoc);
    }
  }, [historyIndex, history, onUpdateDocument]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 2. Active Section / Selection Tracking
  const [activeSectionId, setActiveSectionId] = useState<string>(initialSectionId);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelectedEntryId);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(initialSelectedSectionKey);

  const selectEntry = useCallback((sectionKey: string, entryId: string) => {
    setSelectedSectionKey(sectionKey);
    setSelectedEntryId(entryId);
  }, []);

  const deselectEntry = useCallback(() => {
    setSelectedEntryId(null);
    setSelectedSectionKey(null);
  }, []);

  // 3. Consistency Pass State
  const [findings, setFindings] = useState<ConsistencyFinding[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // Run initial lightweight audit on load
  useEffect(() => {
    let isMounted = true;
    const initialDocId = document.id;
    auditConsistencyApi(document)
      .then((res) => {
        if (isMounted && activeDocIdRef.current === initialDocId) {
          setFindings(res);
        }
      })
      .catch((err) => console.warn("Initial consistency check deferred:", err));
    return () => {
      isMounted = false;
    };
  }, [document.id]);

  const handleRunAudit = useCallback(async () => {
    setIsAuditing(true);
    const startDocId = activeDocIdRef.current;
    try {
      const res = await auditConsistencyApi(currentDoc);
      if (activeDocIdRef.current === startDocId) {
        setFindings(res);
      }
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  }, [currentDoc]);

  const handleApplyFindingFix = useCallback(
    (finding: ConsistencyFinding) => {
      let updated = { ...currentDoc };

      if (finding.sectionKey === "worldPhysics" && finding.fieldKey) {
        updated = {
          ...updated,
          worldPhysics: {
            ...updated.worldPhysics,
            [finding.fieldKey]: finding.suggestedFix,
          },
        };
      } else if (finding.entryId && (updated as any)[finding.sectionKey]) {
        const list: Entry[] = (updated as any)[finding.sectionKey] || [];
        const modifiedList = list.map((e) => {
          if (e.id === finding.entryId) {
            if (finding.fieldKey) {
              const currentVal = e.fields[finding.fieldKey] || "";
              const newVal = currentVal.replace(finding.offendingText, finding.suggestedFix);
              return {
                ...e,
                fields: {
                  ...e.fields,
                  [finding.fieldKey]: newVal || finding.suggestedFix,
                },
              };
            } else if (finding.type === "weak_key") {
              const newKeys = e.keys.map((k) =>
                k.toLowerCase() === finding.offendingText.toLowerCase() ? finding.suggestedFix : k
              );
              return { ...e, keys: newKeys };
            }
          }
          return e;
        });
        (updated as any)[finding.sectionKey] = modifiedList;
      }

      pushDocMutation(updated);
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, applied: true } : f))
      );
    },
    [currentDoc, pushDocMutation]
  );

  const handleDismissFinding = useCallback((findingId: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, dismissed: true } : f))
    );
  }, []);

  const handleClearAllFindings = useCallback(() => {
    setFindings((prev) => prev.map((f) => ({ ...f, dismissed: true })));
  }, []);

  // 4. Ripple System: check cross-references when an entry changes
  const [rippleNotice, setRippleNotice] = useState<RippleNotice | null>(null);

  const checkRipplesForName = useCallback(
    (name: string, sourceEntryId: string): RippleNotice | null => {
      if (!name || name.length < 3) return null;
      const sectionsToCheck = [
        { key: "locations", title: "Location Seeds" },
        { key: "factions", title: "Faction Seeds" },
        { key: "npcs", title: "NPC Cast Seeds" },
        { key: "relationshipWeb", title: "Relationship Web" },
        { key: "knowledgeMap", title: "Knowledge Map" },
        { key: "items", title: "Item Seeds" },
        { key: "secrets", title: "Secret Seeds" },
        { key: "pressures", title: "Pressures & Clocks" },
      ];

      const refs: { sectionKey: string; sectionTitle: string; entryId: string; entryName: string }[] = [];

      for (const sec of sectionsToCheck) {
        const list: Entry[] = (currentDoc as any)[sec.key] || [];
        for (const item of list) {
          if (item.id === sourceEntryId) continue;
          const allText = Object.values(item.fields).join(" ");
          if (allText.toLowerCase().includes(name.toLowerCase())) {
            refs.push({
              sectionKey: sec.key,
              sectionTitle: sec.title,
              entryId: item.id,
              entryName: item.fields.name || item.fields.truth || item.fields.title || item.id,
            });
          }
        }
      }

      if (refs.length > 0) {
        const notice: RippleNotice = {
          sourceName: name,
          sourceEntryId,
          references: refs,
        };
        setRippleNotice(notice);
        return notice;
      } else {
        setRippleNotice(null);
        return null;
      }
    },
    [currentDoc]
  );

  const handleRegenerateRippleReferences = useCallback(
    async (notice: RippleNotice) => {
      const startVersion = docMutationVersionRef.current;
      const startDocId = activeDocIdRef.current;
      let updated = { ...currentDoc };

      for (const ref of notice.references) {
        try {
          const fresh = await rerollEntryApi(
            updated,
            ref.sectionKey,
            ref.entryId,
            `Align with updated details of ${notice.sourceName}`,
            settings
          );
          if (activeDocIdRef.current !== startDocId) return;
          const list: Entry[] = (updated as any)[ref.sectionKey] || [];
          updated = {
            ...updated,
            [ref.sectionKey]: list.map((e) => (e.id === ref.entryId ? fresh : e)),
          };
        } catch (err) {
          console.warn(`Ripple reroll failed for ${ref.entryName}:`, err);
        }
      }

      if (activeDocIdRef.current === startDocId && docMutationVersionRef.current === startVersion) {
        pushDocMutation(updated);
        setRippleNotice(null);
      }
    },
    [currentDoc, settings, pushDocMutation]
  );

  const dismissRippleNotice = useCallback(() => {
    setRippleNotice(null);
  }, []);

  // 5. Entry Operations (Reroll, Lock, Variants, Push, Note, Delete, Duplicate)
  const [isRerollingEntry, setIsRerollingEntry] = useState(false);
  const [variants, setVariants] = useState<VariantSlip[] | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isPushingEntry, setIsPushingEntry] = useState(false);

  const handleToggleLock = useCallback(
    (sectionKey: string, entryId: string) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const updated = list.map((e) =>
        e.id === entryId ? { ...e, locked: !e.locked } : e
      );
      pushDocMutation({ ...currentDoc, [sectionKey]: updated });
    },
    [currentDoc, pushDocMutation]
  );

  const handleRerollEntry = useCallback(
    async (sectionKey: string, entryId: string, instruction?: string) => {
      setIsRerollingEntry(true);
      setOperationError(null);
      const startVersion = docMutationVersionRef.current;
      const startDocId = activeDocIdRef.current;

      try {
        const updatedEntry = await rerollEntryApi(
          currentDoc,
          sectionKey,
          entryId,
          instruction,
          settings
        );

        if (activeDocIdRef.current !== startDocId) return;
        if (docMutationVersionRef.current !== startVersion) {
          // Document was mutated while request was in-flight, update based on latest
          const latestList: Entry[] = (currentDoc as any)[sectionKey] || [];
          const updatedList = latestList.map((e) => (e.id === entryId ? updatedEntry : e));
          pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
        } else {
          const list: Entry[] = (currentDoc as any)[sectionKey] || [];
          const updatedList = list.map((e) => (e.id === entryId ? updatedEntry : e));
          pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
        }

        const name = updatedEntry.fields.name || updatedEntry.fields.truth;
        if (name) checkRipplesForName(name, entryId);
      } catch (err: any) {
        console.error("Reroll entry error:", err);
        setOperationError(err?.message || "The entry could not be regenerated.");
      } finally {
        setIsRerollingEntry(false);
      }
    },
    [currentDoc, settings, pushDocMutation, checkRipplesForName]
  );

  const handleFetchVariants = useCallback(
    async (sectionKey: string, entryId: string) => {
      setIsLoadingVariants(true);
      setOperationError(null);
      const startDocId = activeDocIdRef.current;
      try {
        const slips = await fetchVariantsApi(currentDoc, sectionKey, entryId, settings);
        if (activeDocIdRef.current === startDocId) {
          setVariants(slips);
        }
      } catch (err: any) {
        console.error("Variants error:", err);
        setOperationError(err?.message || "Variants could not be generated.");
      } finally {
        setIsLoadingVariants(false);
      }
    },
    [currentDoc, settings]
  );

  const handlePickVariant = useCallback(
    (sectionKey: string, entryId: string, variant: VariantSlip) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const target = list.find((e) => e.id === entryId);
      const updatedEntry: Entry = {
        ...variant.entry,
        id: entryId,
        locked: target?.locked || false,
        note: target?.note,
      };
      const updatedList = list.map((e) => (e.id === entryId ? updatedEntry : e));
      pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
      setVariants(null);

      const name = updatedEntry.fields.name || updatedEntry.fields.truth;
      if (name) checkRipplesForName(name, entryId);
    },
    [currentDoc, pushDocMutation, checkRipplesForName]
  );

  const clearVariants = useCallback(() => {
    setVariants(null);
  }, []);

  const handlePushEntry = useCallback(
    async (sectionKey: string, entryId: string, instruction: string) => {
      setIsPushingEntry(true);
      setOperationError(null);
      const startVersion = docMutationVersionRef.current;
      const startDocId = activeDocIdRef.current;

      try {
        const updatedEntry = await pushEntryApi(
          currentDoc,
          sectionKey,
          entryId,
          instruction,
          settings
        );

        if (activeDocIdRef.current !== startDocId) return;
        if (docMutationVersionRef.current !== startVersion) {
          const latestList: Entry[] = (currentDoc as any)[sectionKey] || [];
          const updatedList = latestList.map((e) => (e.id === entryId ? updatedEntry : e));
          pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
        } else {
          const list: Entry[] = (currentDoc as any)[sectionKey] || [];
          const updatedList = list.map((e) => (e.id === entryId ? updatedEntry : e));
          pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
        }

        const name = updatedEntry.fields.name || updatedEntry.fields.truth;
        if (name) checkRipplesForName(name, entryId);
      } catch (err: any) {
        console.error("Push entry error:", err);
        setOperationError(err?.message || "The entry could not be revised.");
      } finally {
        setIsPushingEntry(false);
      }
    },
    [currentDoc, settings, pushDocMutation, checkRipplesForName]
  );

  const handleSaveMarginNote = useCallback(
    (
      sectionKey: string,
      entryId: string,
      noteText: string,
      useAsInstruction: boolean
    ) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const updatedList = list.map((e) =>
        e.id === entryId ? { ...e, note: noteText.trim() || undefined } : e
      );
      pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });

      if (useAsInstruction && noteText.trim()) {
        handleRerollEntry(sectionKey, entryId, noteText.trim());
      }
    },
    [currentDoc, pushDocMutation, handleRerollEntry]
  );

  const handleDuplicateEntry = useCallback(
    (sectionKey: string, entryId: string) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const target = list.find((e) => e.id === entryId);
      if (!target) return;

      const dup: Entry = {
        ...target,
        id: `${sectionKey}-${Date.now()}`,
        fields: {
          ...target.fields,
          name: target.fields.name ? `${target.fields.name} (Copy)` : target.fields.truth,
        },
        locked: false,
      };

      const targetIdx = list.findIndex((e) => e.id === entryId);
      const updatedList = [...list];
      updatedList.splice(targetIdx + 1, 0, dup);
      pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
    },
    [currentDoc, pushDocMutation]
  );

  const handleDeleteEntry = useCallback(
    (sectionKey: string, entryId: string) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const updatedList = list.filter((e) => e.id !== entryId);
      pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
        setSelectedSectionKey(null);
      }
    },
    [currentDoc, selectedEntryId, pushDocMutation]
  );

  // 6. Section-level regeneration and field mutations
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  const handleRegenerateSection = useCallback(
    async (sectionKey: string, addCount?: number) => {
      setRegeneratingSection(sectionKey);
      setOperationError(null);
      const startDocId = activeDocIdRef.current;
      const startVersion = docMutationVersionRef.current;

      try {
        const nextEntries = await regenerateSectionApi(currentDoc, sectionKey, addCount, settings);
        if (activeDocIdRef.current !== startDocId) return;
        if (docMutationVersionRef.current !== startVersion) {
          pushDocMutation({ ...currentDoc, [sectionKey]: nextEntries });
        } else {
          pushDocMutation({ ...currentDoc, [sectionKey]: nextEntries });
        }
      } catch (err: any) {
        console.error(`Section regen failed for ${sectionKey}:`, err);
        setOperationError(err?.message || "The section could not be regenerated.");
      } finally {
        setRegeneratingSection(null);
      }
    },
    [currentDoc, settings, pushDocMutation]
  );

  const handleUpdateEntryField = useCallback(
    (sectionKey: string, entryId: string, fieldKey: string, val: string) => {
      const list: Entry[] = (currentDoc as any)[sectionKey] || [];
      const updatedList = list.map((e) => {
        if (e.id === entryId) {
          return {
            ...e,
            fields: {
              ...e.fields,
              [fieldKey]: val,
            },
          };
        }
        return e;
      });
      pushDocMutation({ ...currentDoc, [sectionKey]: updatedList });

      if (fieldKey === "name" || fieldKey === "truth") {
        checkRipplesForName(val, entryId);
      }
    },
    [currentDoc, pushDocMutation, checkRipplesForName]
  );

  const handleUpdateCoreField = useCallback(
    (fieldKey: string, val: string) => {
      pushDocMutation({
        ...currentDoc,
        core: {
          ...currentDoc.core,
          [fieldKey]: val,
        },
      });
    },
    [currentDoc, pushDocMutation]
  );

  const handleUpdateUserField = useCallback(
    (fieldKey: string, val: string) => {
      pushDocMutation({
        ...currentDoc,
        user: {
          ...currentDoc.user,
          [fieldKey]: val,
        },
      });
    },
    [currentDoc, pushDocMutation]
  );

  // 7. Derived Indexing & Statistics
  const allEntriesList = useMemo(() => {
    const sections: { key: string; entries: Entry[] }[] = [
      { key: "factions", entries: currentDoc.factions || [] },
      { key: "locations", entries: currentDoc.locations || [] },
      { key: "npcs", entries: currentDoc.npcs || [] },
      { key: "items", entries: currentDoc.items || [] },
      { key: "secrets", entries: currentDoc.secrets || [] },
      { key: "rulesOfEngagement", entries: currentDoc.rulesOfEngagement || [] },
      { key: "sensoryPalette", entries: currentDoc.sensoryPalette || [] },
      { key: "openLoops", entries: currentDoc.openLoops || [] },
    ];
    const list: { sectionKey: string; entry: Entry }[] = [];
    for (const s of sections) {
      for (const e of s.entries) {
        list.push({ sectionKey: s.key, entry: e });
      }
    }
    return list;
  }, [currentDoc]);

  const liveStats = useMemo(() => {
    let text = `${currentDoc.core.title} ${currentDoc.core.logline || ""} ${currentDoc.core.synopsis || ""} ${currentDoc.core.userRole || ""} ${currentDoc.core.openingCrawl || ""} `;
    text += `${currentDoc.worldPhysics.strangenessRationale || ""} ${currentDoc.worldPhysics.mundanityAnchors || ""} `;
    text += `${currentDoc.opening.firstMessage} ${currentDoc.opening.firstChoice} `;
    for (const item of allEntriesList) {
      text += Object.values(item.entry.fields || {}).join(" ") + " ";
      if (item.entry.keys) text += item.entry.keys.join(" ") + " ";
      if (item.entry.note) text += item.entry.note + " ";
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.round(words * 1.33);
    return { words, tokens };
  }, [currentDoc, allEntriesList]);

  const lastSavedFormatted = useMemo(() => {
    if (!currentDoc.updatedAt) return "moments ago";
    try {
      const diffSec = Math.round(
        (Date.now() - new Date(currentDoc.updatedAt).getTime()) / 1000
      );
      if (diffSec < 10) return "just now";
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      return "earlier";
    } catch {
      return "recently";
    }
  }, [currentDoc.updatedAt]);

  const currentSelectedEntry: Entry | null = useMemo(() => {
    if (!selectedSectionKey || !selectedEntryId) return null;
    const list = (currentDoc as any)[selectedSectionKey] as Entry[] | undefined;
    return list?.find((e) => e.id === selectedEntryId) || null;
  }, [currentDoc, selectedSectionKey, selectedEntryId]);

  const findingsForSelected = useMemo(() => {
    return findings.filter(
      (f) => f.entryId === selectedEntryId && !f.applied && !f.dismissed
    );
  }, [findings, selectedEntryId]);

  // 8. Keyboard Shortcuts (Single Registration Guarantee)
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      // If typing in an input/textarea, ignore non-modifier shortcuts
      if (isEditing || e.metaKey || e.ctrlKey || e.altKey) return;

      // Hotkey: R (reroll selected entry)
      if ((e.key === "r" || e.key === "R") && selectedEntryId && selectedSectionKey) {
        e.preventDefault();
        handleRerollEntry(selectedSectionKey, selectedEntryId);
      }
      // Hotkey: L (toggle lock)
      else if ((e.key === "l" || e.key === "L") && selectedEntryId && selectedSectionKey) {
        e.preventDefault();
        handleToggleLock(selectedSectionKey, selectedEntryId);
      }
      // Hotkey: Escape (deselect)
      else if (e.key === "Escape") {
        if (selectedEntryId) {
          deselectEntry();
        }
      }
      // Hotkeys: ArrowDown / ArrowUp (step through entries)
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (allEntriesList.length > 0) {
          e.preventDefault();
          const currentIndex = allEntriesList.findIndex(
            (item) => item.entry.id === selectedEntryId
          );
          if (currentIndex === -1) {
            selectEntry(allEntriesList[0].sectionKey, allEntriesList[0].entry.id);
          } else {
            const nextIndex =
              e.key === "ArrowDown"
                ? (currentIndex + 1) % allEntriesList.length
                : (currentIndex - 1 + allEntriesList.length) % allEntriesList.length;
            selectEntry(allEntriesList[nextIndex].sectionKey, allEntriesList[nextIndex].entry.id);
          }
        }
      }
    };

    if (typeof window === "undefined") return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enableKeyboardShortcuts,
    handleUndo,
    handleRedo,
    selectedEntryId,
    selectedSectionKey,
    handleRerollEntry,
    handleToggleLock,
    deselectEntry,
    selectEntry,
    allEntriesList,
  ]);

  return {
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
    checkRipplesForName,
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
  };
}
