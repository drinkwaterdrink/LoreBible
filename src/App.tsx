import React, { useState, useEffect, useRef } from "react";
import {
  CanonConfig,
  DivergenceTake,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
  BuildLogItem,
  GenerationProvenance,
  GenerationSettings,
} from "./types";
import {
  parseSparkApi,
  fetchDivergenceTakes,
  fetchSingleDivergenceTake,
  streamForgeDocument,
} from "./services/geminiService";
import { SidebarRail } from "./components/SidebarRail";
import { RightMarginPanel } from "./components/RightMarginPanel";
import { SparkStage } from "./components/SparkStage";
import { DivergenceStage } from "./components/DivergenceStage";
import { PhysicsStage } from "./components/PhysicsStage";
import { ForgeStage } from "./components/ForgeStage";
import { RefineStage } from "./components/RefineStage";
import { VaultModal } from "./components/VaultModal";
import { CommandPalette } from "./components/CommandPalette";
import { ExportModal } from "./components/ExportModal";
import { OnboardingNote } from "./components/OnboardingNote";
import { ShortcutsReferenceCard } from "./components/ShortcutsReferenceCard";
import { WaxSealStamp } from "./components/WaxSealStamp";
import { NewScenarioModal } from "./components/NewScenarioModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  readProjectStore,
  removeProjectFromStore,
  saveProjectToStore,
  writeProjectStore,
  type SavedLoreBibleProjectV2,
} from "./lib/projectPersistence";
import type { GenerationProgressEvent, GenerationStreamEvent, GenerationTask, GenerationUsage } from "./contracts/generationProgress";
import { appendBoundedReasoning } from "./lib/reasoningBuffer";
import { readSparkDraft, writeSparkDraft } from "./lib/sparkDraft";
import { createDraftScenarioDocument, DEFAULT_CANON, DEFAULT_PHYSICS } from "./lib/scenarioDraft";
import { captureSavedProject, captureWorkspaceDraft, restoreSavedProject, restoreWorkspaceDraft } from "./lib/projectWorkspace";
import { clearWorkspaceDraft, readWorkspaceDraft, writeWorkspaceDraft } from "./lib/workspacePersistence";
import { appendDivergenceVersion, initializeDivergenceBoard, initializePushedBoard } from "./lib/divergenceLineage";
import { Menu, Feather, X, PlusCircle, Save } from "lucide-react";
import { AppVersionBadge } from "./components/AppVersionBadge";
import { StorageRecoveryNotice } from "./components/StorageRecoveryNotice";
import { ProjectGraphPanel } from "./components/ProjectGraphPanel";
import { BlueprintPreviewPanel } from "./components/BlueprintPreviewPanel";
import { compileGraphPreview, listPreparedProjectGraphs, loadProjectGraph, prepareProjectGraph, previewBlueprint, renameGraphEntity, type PreparedProjectGraphSummary } from "./services/projectGraphService";
import type { ProjectGraphV1 } from "./contracts/projectGraph";
import type { ProjectGraphArtifactPreview } from "./lib/projectGraph/artifactCompiler";
import type { BlueprintPlanV1 } from "./contracts/blueprint";
import { createBlueprintPlanningContext } from "./lib/blueprint/planningContext";
import { abortBlueprintRequest, findBlueprintSourceProject, getBlueprintFailure, shouldClearBlueprintPlan } from "./lib/blueprint/previewLifecycle";

const DEFAULT_SETTINGS: GenerationSettings = {
  quality: "Deep Craft",
  divergenceMode: "Exploratory",
  authorFlavor: {
    mode: "Off",
    strength: "Sprinkle",
    autoBehavior: "Compatible",
    manualAuthorId: null,
    overdriveEnabled: false,
  },
  modelSelection: { profileId: null, modelId: null },
};

interface ActivityState {
  progress: GenerationProgressEvent | null;
  startedAt: number | null;
  usage: GenerationUsage;
  reasoning: string;
  reasoningTruncated: boolean;
  status: "idle" | "active" | "cancelled" | "complete" | "error";
  lastEventAt: number | null;
  lastProviderActivityAt: number | null;
  outputCharacters: number;
}

function activeActivity(task: GenerationTask, label: string): ActivityState {
  return { progress: { task, phase: "requesting", label }, startedAt: Date.now(), usage: {}, reasoning: "", reasoningTruncated: false, status: "active", lastEventAt: Date.now(), lastProviderActivityAt: null, outputCharacters: 0 };
}

function applyActivityEvent(state: ActivityState, event: GenerationStreamEvent): ActivityState {
  if (event.type === "progress") return { ...state, progress: event, lastEventAt: Date.now() };
  if (event.type === "heartbeat") return { ...state, lastEventAt: Date.now() };
  if (event.type === "provider_activity") return { ...state, lastProviderActivityAt: event.at, lastEventAt: Date.now() };
  if (event.type === "output_delta") return { ...state, outputCharacters: state.outputCharacters + event.characters, lastEventAt: Date.now() };
  if (event.type === "usage") return { ...state, usage: {
    inputTokens: (state.usage.inputTokens || 0) + (event.usage.inputTokens || 0),
    outputTokens: (state.usage.outputTokens || 0) + (event.usage.outputTokens || 0),
    reasoningTokens: (state.usage.reasoningTokens || 0) + (event.usage.reasoningTokens || 0),
  }, lastEventAt: Date.now() };
  if (event.type === "reasoning") {
    const next = appendBoundedReasoning(state.reasoning, `${state.reasoning ? "\n\n" : ""}${event.delta}`);
    return { ...state, reasoning: next.text, reasoningTruncated: state.reasoningTruncated || next.truncated, lastEventAt: Date.now() };
  }
  if (event.type === "cancelled") return { ...state, status: "cancelled", progress: { task: event.task, phase: "cancelled", label: event.message }, lastEventAt: Date.now() };
  if (event.type === "error") return { ...state, status: "error", progress: { task: event.task, phase: "error", label: event.message }, lastEventAt: Date.now() };
  if (event.type === "done") return { ...state, status: "complete", progress: { task: event.task, phase: "complete", label: "Complete" }, lastEventAt: Date.now() };
  return state;
}
const STORAGE_KEY_THEME = "lore_bible_theme_mode_v1";
const STORAGE_KEY_MODEL_SELECTION = "lore_bible_model_selection_v1";

function readGlobalModelSelection(storage: Storage): GenerationSettings["modelSelection"] {
  try {
    const saved = storage.getItem(STORAGE_KEY_MODEL_SELECTION);
    if (!saved) return DEFAULT_SETTINGS.modelSelection;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_SETTINGS.modelSelection;
    const record = parsed as Record<string, unknown>;
    return {
      profileId: typeof record.profileId === "string" ? record.profileId : null,
      modelId: typeof record.modelId === "string" ? record.modelId : null,
    };
  } catch {
    return DEFAULT_SETTINGS.modelSelection;
  }
}

function loadInitialPersistence(storage: Storage) {
  const projects = readProjectStore(storage);
  const workspace = readWorkspaceDraft(storage);
  const active = workspace.draft ? restoreWorkspaceDraft(workspace.draft) : null;
  return {
    savedProjects: projects.store.projects,
    active,
    fallbackSparkText: active ? active.sparkText : workspace.warning ? "" : readSparkDraft(storage),
    settings: active?.settings || { ...DEFAULT_SETTINGS, modelSelection: readGlobalModelSelection(storage) },
    warning: [
      projects.warning,
      workspace.warning ? `${workspace.warning} Active autosave is paused until you open a saved project or start a new scenario.` : null,
    ].filter(Boolean).join(" ") || null,
    workspaceWriteBlocked: Boolean(workspace.warning),
  };
}

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_THEME) === "dark";
  });
  const [initialPersistence] = useState(() => loadInitialPersistence(window.localStorage));

  useEffect(() => {
    const docEl = typeof window !== "undefined" && window.document ? window.document.documentElement : null;
    if (!docEl) return;

    if (isDark) {
      docEl.classList.add("dark");
      localStorage.setItem(STORAGE_KEY_THEME, "dark");
    } else {
      docEl.classList.remove("dark");
      localStorage.setItem(STORAGE_KEY_THEME, "light");
    }
  }, [isDark]);

  // Wizard state
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(initialPersistence.active?.currentStage || 1);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<1 | 2 | 3 | 4 | 5>(initialPersistence.active?.maxUnlockedStage || 1);

  // Spark state
  const [sparkText, setSparkText] = useState<string>(initialPersistence.fallbackSparkText);
  const [parse, setParse] = useState<SparkParse | null>(initialPersistence.active?.parse || null);
  const [isParsingSpark, setIsParsingSpark] = useState(false);

  // Canon state
  const [canon, setCanon] = useState<CanonConfig>(initialPersistence.active?.canon || DEFAULT_CANON);

  // Generation Settings (Quality, Divergence Mode, Author Flavor)
  const [settings, setSettings] = useState<GenerationSettings>(initialPersistence.settings);

  // Divergence state
  const [takes, setTakes] = useState<DivergenceTake[]>(initialPersistence.active?.takes || []);
  const [selectedTakeId, setSelectedTakeId] = useState<string | undefined>(initialPersistence.active?.selectedTakeId || undefined);
  const [isLoadingDivergence, setIsLoadingDivergence] = useState(false);
  const [rerollingSingleId, setRerollingSingleId] = useState<string | null>(null);
  const [divergenceError, setDivergenceError] = useState<string | null>(null);
  const [anchorActivity, setAnchorActivity] = useState<ActivityState>(() => ({ ...activeActivity("anchors", "Ready"), startedAt: null, status: "idle", lastEventAt: null }));
  const [divergenceActivity, setDivergenceActivity] = useState<ActivityState>(() => ({ ...activeActivity("divergence", "Ready"), startedAt: null, status: "idle", lastEventAt: null }));
  const anchorControllerRef = useRef<AbortController | null>(null);
  const divergenceControllerRef = useRef<AbortController | null>(null);

  // Physics state
  const [physics, setPhysics] = useState<PhysicsConfig>(initialPersistence.active?.physics || DEFAULT_PHYSICS);

  // Document & Forge state
  const [document, setDocument] = useState<LoreBibleDocument | null>(initialPersistence.active?.document || null);
  const [provenance, setProvenance] = useState<GenerationProvenance[]>(initialPersistence.active?.provenance || []);
  const [streamedSections, setStreamedSections] = useState<Record<string, any>>({});
  const [buildLogs, setBuildLogs] = useState<BuildLogItem[]>([]);
  const [isForging, setIsForging] = useState(false);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [forgeActivity, setForgeActivity] = useState<ActivityState>(() => ({ ...activeActivity("forge", "Ready"), startedAt: null, status: "idle", lastEventAt: null }));
  const forgeControllerRef = useRef<AbortController | null>(null);

  // Vault & Modals
  const [savedProjects, setSavedProjects] = useState<SavedLoreBibleProjectV2[]>(initialPersistence.savedProjects);
  const [storageWarning, setStorageWarning] = useState<string | null>(initialPersistence.warning);
  const [workspaceWriteBlocked, setWorkspaceWriteBlocked] = useState(initialPersistence.workspaceWriteBlocked);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [preparedGraphs, setPreparedGraphs] = useState<PreparedProjectGraphSummary[]>([]);
  const [preparingGraphId, setPreparingGraphId] = useState<string | null>(null);
  const [activeGraph, setActiveGraph] = useState<ProjectGraphV1 | null>(null);
  const [graphPreview, setGraphPreview] = useState<ProjectGraphArtifactPreview | null>(null);
  const [blueprintPlan, setBlueprintPlan] = useState<BlueprintPlanV1 | null>(null);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [blueprintReloadRequired, setBlueprintReloadRequired] = useState(false);
  const [blueprintBusy, setBlueprintBusy] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const blueprintControllerRef = useRef<AbortController | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("lore_bible_onboarded_v1");
    } catch {
      return false;
    }
  });
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMarginOpen, setIsMarginOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1280;
    }
    return false;
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNewScenarioModalOpen, setIsNewScenarioModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWaxStampActive, setIsWaxStampActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chosenTake = takes.find((t) => t.id === selectedTakeId);
  const workingTitle =
    document?.core?.title ||
    chosenTake?.title ||
    (sparkText ? sparkText.slice(0, 36) : "Untitled Scenario");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODEL_SELECTION, JSON.stringify(settings.modelSelection || null));
    } catch {
      // Model IDs are a convenience only; generation remains usable if storage is unavailable.
    }
  }, [settings.modelSelection]);

  useEffect(() => {
    if (workspaceWriteBlocked) return;
    const timer = window.setTimeout(() => {
      try {
        const hasActiveWork = Boolean(sparkText.trim() || document || takes.length > 0 || parse || currentStage > 1);
        if (!hasActiveWork) {
          clearWorkspaceDraft(window.localStorage);
          return;
        }
        writeWorkspaceDraft(window.localStorage, captureWorkspaceDraft({
          document,
          currentStage,
          maxUnlockedStage,
          sparkText,
          parse,
          canon,
          physics,
          takes,
          selectedTakeId,
          settings,
          provenance,
        }));
        writeSparkDraft(window.localStorage, "");
      } catch (error) {
        setStorageWarning(error instanceof Error ? error.message : "Could not save the active workspace.");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [canon, currentStage, document, maxUnlockedStage, parse, physics, provenance, selectedTakeId, settings, sparkText, takes, workspaceWriteBlocked]);

  useEffect(() => () => {
    anchorControllerRef.current?.abort();
    divergenceControllerRef.current?.abort();
    forgeControllerRef.current?.abort();
  }, []);

  const handleCancelAnchors = () => anchorControllerRef.current?.abort();
  const handleCancelDivergence = () => divergenceControllerRef.current?.abort();
  const handleCancelForge = () => forgeControllerRef.current?.abort();

  // Explicit Margin Inking handler (User presses button when finished writing)
  const handleAnalyzeSpark = async () => {
    if (!sparkText.trim()) return;
    anchorControllerRef.current?.abort();
    const controller = new AbortController();
    anchorControllerRef.current = controller;
    setAnchorActivity(activeActivity("anchors", "Sending anchors"));
    setIsParsingSpark(true);
    try {
      setAnchorActivity((state) => ({ ...state, progress: { task: "anchors", phase: "waiting", label: "Waiting for model", completedSteps: 1, totalSteps: 3 } }));
      const parsed = await parseSparkApi(sparkText, settings, controller.signal);
      setAnchorActivity((state) => ({ ...state, progress: { task: "anchors", phase: "validating", label: "Validating anchors", completedSteps: 2, totalSteps: 3 } }));
      setParse((prev) => {
        if (!prev) return parsed;
        // Merge without losing user's custom non-negotiables
        const mergedNonNegotiables = Array.from(
          new Set([...prev.nonNegotiables, ...parsed.nonNegotiables])
        );
        const mergedRegisterWords = Array.from(
          new Set([...prev.registerWords, ...parsed.registerWords])
        );
        return {
          ...parsed,
          nonNegotiables: mergedNonNegotiables.length > 0 ? mergedNonNegotiables : parsed.nonNegotiables,
          registerWords: mergedRegisterWords.length > 0 ? mergedRegisterWords : parsed.registerWords,
          userRole: prev.userRole || parsed.userRole,
        };
      });
      if (parsed.franchise) {
        setCanon((prev) => ({
          ...prev,
          enabled: true,
          franchiseName: parsed.franchise,
        }));
      }
      setIsMarginOpen(true);
      setAnchorActivity((state) => ({ ...state, status: "complete", progress: { task: "anchors", phase: "complete", label: "Anchors complete", completedSteps: 3, totalSteps: 3 } }));
      triggerToast("Margin Apparatus inked and analyzed from premise.");
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") {
        setAnchorActivity((state) => ({ ...state, status: "cancelled", progress: { task: "anchors", phase: "cancelled", label: "Scribing stopped" } }));
        triggerToast("Scribing stopped.");
        return;
      }
      console.error("Manual spark analyze error:", err);
      setAnchorActivity((state) => ({ ...state, status: "error", progress: { task: "anchors", phase: "error", label: err?.message || "Anchor analysis failed" } }));
      triggerToast("Unable to reach AI analyzer; offline template preserved.");
    } finally {
      setIsParsingSpark(false);
      if (anchorControllerRef.current === controller) anchorControllerRef.current = null;
    }
  };

  const commitProjectStore = (projects: SavedLoreBibleProjectV2[]): boolean => {
    try {
      writeProjectStore(window.localStorage, { schemaVersion: 2, projects });
      setSavedProjects(projects);
      return true;
    } catch (error) {
      setStorageWarning(error instanceof Error ? error.message : "Could not save the Vault.");
      return false;
    }
  };

  const buildSavedProject = (nextDocument: LoreBibleDocument, stage = currentStage, unlocked = maxUnlockedStage) => captureSavedProject({
    document: nextDocument,
    currentStage: stage,
    maxUnlockedStage: unlocked,
    sparkText,
    parse,
    canon,
    physics,
    takes,
    selectedTakeId,
    settings,
    provenance,
  });

  // Explicit Save Scenario handler with wax seal animation
  const handleSaveCurrentScenario = (): boolean => {
    const title = workingTitle;
    const nextDocument = document
      ? {
        ...document,
        title,
        updatedAt: new Date().toISOString(),
      } as LoreBibleDocument
      : createDraftScenarioDocument({
        sparkText,
        parse,
        canon,
        physics,
        chosenTake,
        takes,
        title,
      });
    const project = buildSavedProject(nextDocument);
    const nextStore = saveProjectToStore({ schemaVersion: 2, projects: savedProjects }, project);
    if (!commitProjectStore(nextStore.projects)) return false;
    setDocument(project.document);
    setIsWaxStampActive(true);
    triggerToast("Manuscript sealed & preserved in the Vault.");
    return true;
  };

  // Start fresh scenario prompts
  const handlePromptNewScenario = () => {
    const hasWork = sparkText.trim().length > 0 || document !== null || takes.length > 0;
    if (hasWork) {
      setIsNewScenarioModalOpen(true);
    } else {
      handleStartFreshScenario(false);
    }
  };

  const handleStartFreshScenario = (saveFirst: boolean) => {
    if (saveFirst) {
      if (!handleSaveCurrentScenario()) return;
    }
    writeSparkDraft(window.localStorage, "");
    try {
      clearWorkspaceDraft(window.localStorage);
    } catch (error) {
      setStorageWarning(error instanceof Error ? error.message : "Could not clear the active workspace draft.");
    }
    setWorkspaceWriteBlocked(false);
    setSparkText("");
    setParse(null);
    setCanon({
      enabled: false,
      franchiseName: null,
      fidelity: "Adjacent",
      explanation: "",
    });
    setTakes([]);
    setSelectedTakeId(undefined);
    setDocument(null);
    setProvenance([]);
    setStreamedSections({});
    setBuildLogs([]);
    setPhysics(DEFAULT_PHYSICS);
    setCurrentStage(1);
    setMaxUnlockedStage(1);
    setIsNewScenarioModalOpen(false);
    triggerToast("Clean desk ready for a new scenario.");
  };

  // Global keyboard shortcuts (Cmd-K, Cmd-S, ?, Esc)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveCurrentScenario();
      } else if (e.key === "?" && !isEditing) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsShortcutsOpen(false);
        setIsCommandPaletteOpen(false);
        setIsVaultOpen(false);
        setIsExportOpen(false);
        setIsOnboardingOpen(false);
        setIsMobileNavOpen(false);
        setIsNewScenarioModalOpen(false);
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [document, sparkText, chosenTake, takes, parse, canon, physics]);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem("lore_bible_onboarded_v1", "true");
    } catch {
      // ignore
    }
  };

  // Proceed from Stage 1 (SPARK) -> Stage 2 (DIVERGENCE)
  const handleProceedToDivergence = async () => {
    if (!sparkText.trim()) return;
    divergenceControllerRef.current?.abort();
    const controller = new AbortController();
    divergenceControllerRef.current = controller;
    setDivergenceActivity(activeActivity("divergence", "Preparing divergence"));
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      // Ensure parse is ready
      let currentParse = parse;
      if (!currentParse || currentParse.nonNegotiables.length === 0) {
        currentParse = await parseSparkApi(sparkText, settings, controller.signal);
        setParse(currentParse);
      }

      const generatedTakes = await fetchDivergenceTakes(sparkText, currentParse, canon, undefined, settings, { signal: controller.signal, onEvent: (event) => setDivergenceActivity((state) => applyActivityEvent(state, event)), operation: "initial" });
      const initializedTakes = initializeDivergenceBoard(generatedTakes, "initial");
      setTakes(initializedTakes);
      if (initializedTakes.length > 0) {
        setSelectedTakeId(initializedTakes[0].id);
      }
      setCurrentStage(2);
      setMaxUnlockedStage((prev) => (prev < 2 ? 2 : prev));
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") {
        setDivergenceActivity((state) => ({ ...state, status: "cancelled", progress: { task: "divergence", phase: "cancelled", label: "Generation stopped" } }));
        return;
      }
      console.error("Proceed to divergence error:", err);
      setDivergenceError(err?.message || "Failed to generate divergence angles.");
      setCurrentStage(2);
    } finally {
      setIsLoadingDivergence(false);
      if (divergenceControllerRef.current === controller) divergenceControllerRef.current = null;
    }
  };

  // Reroll all divergence takes
  const handleRerollDivergence = async () => {
    divergenceControllerRef.current?.abort();
    const controller = new AbortController();
    divergenceControllerRef.current = controller;
    setDivergenceActivity(activeActivity("divergence", "Preparing reroll"));
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      const freshTakes = await fetchDivergenceTakes(sparkText, parse, canon, undefined, settings, { signal: controller.signal, onEvent: (event) => setDivergenceActivity((state) => applyActivityEvent(state, event)), operation: "reroll_all" });
      const initializedTakes = initializeDivergenceBoard(freshTakes, "reroll_all");
      setTakes(initializedTakes);
      if (initializedTakes.length > 0) {
        setSelectedTakeId(initializedTakes[0].id);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") {
        setDivergenceActivity((state) => ({ ...state, status: "cancelled", progress: { task: "divergence", phase: "cancelled", label: "Generation stopped" } }));
        return;
      }
      console.error("Reroll divergence error:", err);
      setDivergenceError(err?.message || "Failed to reroll divergence angles.");
    } finally {
      setIsLoadingDivergence(false);
      if (divergenceControllerRef.current === controller) divergenceControllerRef.current = null;
    }
  };

  // Push further from a specific take across 4 variations
  const handlePushFurther = async (take: DivergenceTake, pushInstruction: string) => {
    divergenceControllerRef.current?.abort();
    const controller = new AbortController();
    divergenceControllerRef.current = controller;
    setDivergenceActivity(activeActivity("divergence", "Preparing pushed branches"));
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      const branchedTakes = await fetchDivergenceTakes(sparkText, parse, canon, pushInstruction, settings, { signal: controller.signal, onEvent: (event) => setDivergenceActivity((state) => applyActivityEvent(state, event)), sourceTake: take, operation: "push_further" });
      const initialized = initializePushedBoard(branchedTakes, take);
      setTakes(initialized);
      if (initialized.length > 0) {
        setSelectedTakeId(initialized[0].id);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") {
        setDivergenceActivity((state) => ({ ...state, status: "cancelled", progress: { task: "divergence", phase: "cancelled", label: "Generation stopped" } }));
        return;
      }
      console.error("Push further error:", err);
      setDivergenceError(err?.message || "Failed to push premise angle.");
    } finally {
      setIsLoadingDivergence(false);
      if (divergenceControllerRef.current === controller) divergenceControllerRef.current = null;
    }
  };

  // Reroll single individual angle
  const handleRerollSingleTake = async (targetTake: DivergenceTake) => {
    setRerollingSingleId(targetTake.id);
    setDivergenceError(null);
    try {
      let currentParse = parse;
      if (!currentParse || currentParse.nonNegotiables.length === 0) {
        currentParse = await parseSparkApi(sparkText, settings);
        setParse(currentParse);
      }
      const freshTake = await fetchSingleDivergenceTake({
        sparkText,
        parse: currentParse,
        canon,
        targetAngle: targetTake.angle,
        currentTake: targetTake,
        settings,
      });

      const takeWithHistory = appendDivergenceVersion(targetTake, freshTake, "reroll");

      setTakes((prev) =>
        prev.map((t) =>
          t.id === targetTake.id || t.versions?.some((v) => v.id === targetTake.id)
            ? takeWithHistory
            : t
        )
      );

      if (selectedTakeId === targetTake.id) {
        setSelectedTakeId(freshTake.id);
      }
    } catch (err: any) {
      console.error("Single take reroll error:", err);
      setDivergenceError(err?.message || "Failed to reroll this angle.");
    } finally {
      setRerollingSingleId(null);
    }
  };

  // Steer single individual angle
  const handleSteerSingleTake = async (targetTake: DivergenceTake, steerInstruction: string) => {
    setRerollingSingleId(targetTake.id);
    setDivergenceError(null);
    try {
      let currentParse = parse;
      if (!currentParse || currentParse.nonNegotiables.length === 0) {
        currentParse = await parseSparkApi(sparkText, settings);
        setParse(currentParse);
      }
      const steeredTake = await fetchSingleDivergenceTake({
        sparkText,
        parse: currentParse,
        canon,
        targetAngle: targetTake.angle,
        currentTake: targetTake,
        steerInstruction,
        settings,
      });

      const steeredWithNote: DivergenceTake = {
        ...steeredTake,
        steerNote: steerInstruction,
      };

      const takeWithHistory = appendDivergenceVersion(targetTake, steeredWithNote, "steer");

      setTakes((prev) =>
        prev.map((t) =>
          t.id === targetTake.id || t.versions?.some((v) => v.id === targetTake.id)
            ? takeWithHistory
            : t
        )
      );

      if (selectedTakeId === targetTake.id) {
        setSelectedTakeId(steeredTake.id);
      }
    } catch (err: any) {
      console.error("Single take steer error:", err);
      setDivergenceError(err?.message || "Failed to steer this angle.");
    } finally {
      setRerollingSingleId(null);
    }
  };

  // Switch displayed version of a take slot
  const handleSwitchTakeVersion = (takeSlotId: string, versionIndex: number) => {
    setTakes((prev) =>
      prev.map((t) => {
        const matches = t.id === takeSlotId || t.versions?.some((v) => v.id === takeSlotId);
        if (!matches) return t;

        const versions = t.versions || [t];
        if (versionIndex < 0 || versionIndex >= versions.length) return t;

        const targetVersion = versions[versionIndex];
        const updated: DivergenceTake = {
          ...targetVersion,
          versions,
          versionIndex,
        };

        if (selectedTakeId === t.id) {
          setSelectedTakeId(updated.id);
        }
        return updated;
      })
    );
  };

  // Update take after manual edit
  const handleUpdateTake = (updatedTake: DivergenceTake) => {
    setTakes((prev) =>
      prev.map((t) => {
        const matches = t.id === updatedTake.id || t.versions?.some((v) => v.id === updatedTake.id);
        if (!matches) return t;

        const editedSnapshot: DivergenceTake = {
          ...updatedTake,
          id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          isEdited: true,
        };
        const finalTake = appendDivergenceVersion(t, editedSnapshot, "manual_edit");

        if (selectedTakeId === t.id) {
          setSelectedTakeId(finalTake.id);
        }
        return finalTake;
      })
    );
  };

  // Proceed from Stage 2 (DIVERGENCE) -> Stage 3 (PHYSICS)
  const handleProceedToPhysics = () => {
    setCurrentStage(3);
    setMaxUnlockedStage((prev) => (prev < 3 ? 3 : prev));
  };

  // Proceed from Stage 3 (PHYSICS) -> Stage 4 (FORGE)
  const handleStartForge = async () => {
    const chosenTake = takes.find((t) => t.id === selectedTakeId) || takes[0];
    forgeControllerRef.current?.abort();
    const controller = new AbortController();
    forgeControllerRef.current = controller;
    setForgeActivity(activeActivity("forge", "Preparing the Forge"));
    setCurrentStage(4);
    setMaxUnlockedStage((prev) => (prev < 4 ? 4 : prev));
    setIsForging(true);
    setForgeError(null);
    setBuildLogs([]);
    setStreamedSections({});

    await streamForgeDocument(
      {
        sparkText,
        parse,
        canon,
        physics,
        chosenTake,
        settings,
      },
      {
        onLog: (log) => {
          setBuildLogs((prev) => [
            ...prev,
            {
              id: "log-" + Date.now() + Math.random(),
              stage: log.stage,
              label: log.label,
              status: log.status,
            },
          ]);
        },
        onSection: (key, data) => {
          setStreamedSections((prev) => ({ ...prev, [key]: data }));
        },
        onComplete: (doc) => {
          setDocument(doc);
          setIsForging(false);
          setForgeActivity((state) => ({ ...state, status: "complete", progress: { task: "forge", phase: "complete", label: "Forge complete", completedSteps: 6, totalSteps: 6 } }));
          setMaxUnlockedStage(5);
          const project = buildSavedProject(doc, 5, 5);
          const nextStore = saveProjectToStore({ schemaVersion: 2, projects: savedProjects }, project);
          commitProjectStore(nextStore.projects);
        },
        onError: (err) => {
          console.error("Forge error:", err);
          setForgeError(err);
          setIsForging(false);
          setForgeActivity((state) => ({ ...state, status: "error", progress: { task: "forge", phase: "error", label: err } }));
        },
        onProgress: (event) => {
          setForgeActivity((state) => applyActivityEvent(state, { type: "progress", ...event }));
          setBuildLogs((prev) => [...prev, { id: `log-${Date.now()}-${Math.random()}`, stage: event.phase, label: event.label, status: event.completedSteps === event.totalSteps ? "done" : "active" }]);
        },
        onUsage: (usage) => setForgeActivity((state) => applyActivityEvent(state, { type: "usage", task: "forge", usage })),
        onReasoning: (delta, complete) => setForgeActivity((state) => applyActivityEvent(state, { type: "reasoning", task: "forge", delta, complete })),
        onProviderActivity: (at) => setForgeActivity((state) => applyActivityEvent(state, { type: "provider_activity", task: "forge", at })),
        onOutputDelta: (characters) => setForgeActivity((state) => applyActivityEvent(state, { type: "output_delta", task: "forge", characters })),
        onHeartbeat: () => setForgeActivity((state) => ({ ...state, lastEventAt: Date.now() })),
        onCancelled: (message) => {
          setIsForging(false);
          setForgeActivity((state) => ({ ...state, status: "cancelled", progress: { task: "forge", phase: "cancelled", label: message } }));
        },
      },
      controller.signal,
    );
    if (forgeControllerRef.current === controller) forgeControllerRef.current = null;
  };

  // Proceed from Stage 4 (FORGE) -> Stage 5 (REFINE)
  const handleProceedToRefine = () => {
    setCurrentStage(5);
  };

  // Vault Actions
  const handleLoadProject = (project: SavedLoreBibleProjectV2) => {
    const restored = restoreSavedProject(project);
    try {
      clearWorkspaceDraft(window.localStorage);
    } catch (error) {
      setStorageWarning(error instanceof Error ? error.message : "Could not replace the active workspace draft.");
    }
    setWorkspaceWriteBlocked(false);
    setDocument(restored.document);
    setSparkText(restored.sparkText);
    setParse(restored.parse);
    setCanon(restored.canon);
    setPhysics(restored.physics);
    setTakes(restored.takes);
    setSelectedTakeId(restored.selectedTakeId || undefined);
    setSettings(restored.settings);
    setProvenance(restored.provenance);
    setStreamedSections({});
    setBuildLogs([]);
    setCurrentStage(restored.currentStage);
    setMaxUnlockedStage(restored.maxUnlockedStage);
  };

  const handleDeleteProject = (id: string) => {
    const next = removeProjectFromStore({ schemaVersion: 2, projects: savedProjects }, id);
    if (commitProjectStore(next.projects)) triggerToast("Manuscript removed from the Vault.");
  };

  const handleDuplicateProject = (project: SavedLoreBibleProjectV2) => {
    const scenario = project.document;
    const duplicateId = "doc-" + Date.now();
    const duplicated: LoreBibleDocument = {
      ...scenario,
      id: duplicateId,
      title: `${scenario.core?.title || scenario.title} (Copy)`,
      core: {
        ...scenario.core,
        title: `${scenario.core?.title || scenario.title} (Copy)`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const duplicatedProject: SavedLoreBibleProjectV2 = {
      ...project,
      document: duplicated,
      savedAt: duplicated.updatedAt,
    };
    const next = saveProjectToStore({ schemaVersion: 2, projects: savedProjects }, duplicatedProject);
    if (commitProjectStore(next.projects)) triggerToast("Manuscript duplicated.");
  };

  const handleRenameProject = (id: string, newTitle: string) => {
    const renamedProjects = savedProjects.map((project) => {
      const item = project.document;
      if (item.id === id) {
        return {
          ...project,
          savedAt: new Date().toISOString(),
          document: {
            ...item,
            title: newTitle,
            core: { ...item.core, title: newTitle },
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return project;
    });
    if (!commitProjectStore(renamedProjects)) return;
    if (document?.id === id) {
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              title: newTitle,
              core: { ...prev.core, title: newTitle },
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    }
  };

  const refreshPreparedGraphs = async () => {
    const summaries = await listPreparedProjectGraphs();
    setPreparedGraphs(summaries);
  };

  useEffect(() => {
    if (!isVaultOpen) return;
    void refreshPreparedGraphs().catch((error) => {
      triggerToast(error instanceof Error ? error.message : "Could not load Project Graphs.");
    });
  }, [isVaultOpen]);

  useEffect(() => () => abortBlueprintRequest(blueprintControllerRef.current), []);

  const acceptActiveGraph = (nextGraph: ProjectGraphV1) => {
    const revision = nextGraph.project.revision ?? 1;
    const activeRevision = activeGraph?.project.revision ?? 1;
    const graphChanged = Boolean(activeGraph && (activeGraph.project.id !== nextGraph.project.id || activeRevision !== revision));
    const planIsStale = shouldClearBlueprintPlan(blueprintPlan, nextGraph);
    if (graphChanged || planIsStale) {
      abortBlueprintRequest(blueprintControllerRef.current);
      blueprintControllerRef.current = null;
      setBlueprintBusy(false);
      if (planIsStale) setBlueprintPlan(null);
      setBlueprintError(null);
      setBlueprintReloadRequired(false);
      setIsBlueprintOpen(false);
    }
    setActiveGraph(nextGraph);
  };

  const handlePrepareGraph = async (project: SavedLoreBibleProjectV2) => {
    setPreparingGraphId(project.document.id);
    try {
      const result = await prepareProjectGraph(project);
      acceptActiveGraph(result.graph);
      setGraphPreview(null);
      setIsVaultOpen(false);
      await refreshPreparedGraphs();
      triggerToast(result.status === "already_prepared" ? "Existing Project Graph opened." : "Project Graph prepared. The V2 project is unchanged.");
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Could not prepare the Project Graph.");
    } finally {
      setPreparingGraphId(null);
    }
  };

  const handleOpenGraph = async (projectId: string) => {
    try {
      acceptActiveGraph(await loadProjectGraph(projectId));
      setGraphPreview(null);
      setIsVaultOpen(false);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "Could not open the Project Graph.");
    }
  };

  const handleRenameGraphEntity = async (entityId: string, name: string) => {
    if (!activeGraph) throw new Error("No Project Graph is open.");
    const result = await renameGraphEntity(activeGraph.project.id, activeGraph.project.revision, entityId, name);
    acceptActiveGraph(result.graph);
    setGraphPreview(null);
    await refreshPreparedGraphs();
    return result;
  };

  const handleReloadGraph = async () => {
    if (!activeGraph) return;
    acceptActiveGraph(await loadProjectGraph(activeGraph.project.id));
    setGraphPreview(null);
  };

  const handleCompileGraph = async () => {
    if (!activeGraph) return;
    setGraphPreview(await compileGraphPreview(activeGraph.project.id));
  };

  const handlePreviewBlueprint = async () => {
    if (!activeGraph || blueprintBusy) return;
    const sourceProject = findBlueprintSourceProject(activeGraph.project.id, preparedGraphs, savedProjects);
    if (!sourceProject) {
      setBlueprintError("The source V2 project is unavailable. Reopen the Vault and prepare this graph again.");
      return;
    }
    abortBlueprintRequest(blueprintControllerRef.current);
    const controller = new AbortController();
    blueprintControllerRef.current = controller;
    setBlueprintBusy(true);
    setBlueprintError(null);
    setBlueprintReloadRequired(false);
    try {
      const revision = activeGraph.project.revision ?? 1;
      const context = createBlueprintPlanningContext(sourceProject, { projectId: activeGraph.project.id, projectRevision: revision });
      const plan = await previewBlueprint(activeGraph.project.id, { expectedRevision: revision, context }, controller.signal);
      setBlueprintPlan(plan);
      setIsBlueprintOpen(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure = getBlueprintFailure(error, Boolean(blueprintPlan));
      setBlueprintError(failure.message);
      setBlueprintReloadRequired(failure.reloadRequired);
    } finally {
      if (blueprintControllerRef.current === controller) {
        blueprintControllerRef.current = null;
        setBlueprintBusy(false);
      }
    }
  };

  const handleReloadBlueprint = async () => {
    if (!activeGraph) return;
    try {
      acceptActiveGraph(await loadProjectGraph(activeGraph.project.id));
      setBlueprintError(null);
      setBlueprintReloadRequired(false);
    } catch (error) {
      setBlueprintError(error instanceof Error ? error.message : "Could not reload the Project Graph.");
    }
  };

  const closeBlueprint = () => {
    abortBlueprintRequest(blueprintControllerRef.current);
    blueprintControllerRef.current = null;
    setBlueprintBusy(false);
    setIsBlueprintOpen(false);
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col relative bg-[var(--vellum)] text-[var(--ink)] overflow-hidden">
      {/* Paper texture overlay (fixed SVG grain + laid lines) */}
      <div className="texture-overlay" />
      <div className="laid-lines" />

      {/* Desk lamp pool of warmth */}
      <div className="lamp-light" />

      {/* Mobile Top App Bar (visible only on < md) */}
      <header className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[var(--ink-soft)] bg-[var(--vellum-deep)] shrink-0 z-20">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="flex items-center gap-1.5 text-xs font-apparatus font-semibold text-[var(--ink)]"
        >
          <Menu size={16} className="text-[var(--rubric)]" />
          <span className="flex items-baseline gap-1">§ LORE BIBLE <AppVersionBadge /></span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePromptNewScenario}
            className="btn-secondary text-[11px] py-1 px-2 flex items-center gap-1 text-[var(--rubric)]"
            title="Start fresh scenario"
          >
            <PlusCircle size={12} />
            <span>New</span>
          </button>
          <button
            type="button"
            onClick={handleSaveCurrentScenario}
            className="btn-primary text-[11px] py-1 px-2 flex items-center gap-1 shadow-xs"
            title="Seal scenario to Vault"
          >
            <Save size={12} />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMarginOpen(!isMarginOpen)}
            className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5"
          >
            <Feather size={12} className="text-[var(--rubric)]" />
            <span>Margin</span>
            {parse?.nonNegotiables && parse.nonNegotiables.length > 0 && (
              <span className="font-mono-ui text-[9px] bg-[var(--ink-soft)] px-1 rounded">
                {parse.nonNegotiables.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Frame */}
      <div className="relative z-10 flex-1 flex flex-row w-full h-full min-h-0 min-w-0 overflow-hidden">
        {/* Persistent Left Progress Rail for Desktop */}
        <div className="hidden md:flex h-full shrink-0">
          <SidebarRail
            currentStage={currentStage}
            onSelectStage={(s) => setCurrentStage(s)}
            maxUnlockedStage={maxUnlockedStage}
            workingTitle={workingTitle}
            modelSummary={settings.modelSelection?.modelId || "Default Gemini / offline"}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
            onOpenVault={() => setIsVaultOpen(true)}
            savedCount={savedProjects.length}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewScenario={handlePromptNewScenario}
            onSaveScenario={handleSaveCurrentScenario}
          />
        </div>

        {/* Central Manuscript Stage Viewport */}
        <main
          id="main-stage-viewport"
          className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden px-4 sm:px-8 md:px-12 py-5 relative scroll-smooth"
        >
          {/* Top Quick Context & Margin Toggle Bar for Desktop & Tablet */}
          <div className="flex items-center justify-between mb-4 border-b border-[var(--ink-soft)] pb-2.5">
            <div className="flex items-center gap-2 text-[11px] font-apparatus text-[var(--graphite)]">
              <span className="font-semibold text-[var(--ink)] uppercase tracking-wider">
                Stage {String(currentStage).padStart(2, "0")}
              </span>
              <span>·</span>
              <span className="text-[var(--ink)] font-manuscript">
                {currentStage === 1 && "Origin Seed & Premise"}
                {currentStage === 2 && "Divergence Angles"}
                {currentStage === 3 && "World Physics & Rules"}
                {currentStage === 4 && "Synthesis Forge"}
                {currentStage === 5 && "Manuscript Codex"}
              </span>
            </div>

            {/* Quick Actions and Toggle for Margin Apparatus */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePromptNewScenario}
                className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-[var(--rubric)] hover:border-[var(--rubric)] font-apparatus"
                title="Start a fresh scenario"
              >
                <PlusCircle size={12} />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentScenario}
                className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1.5 font-apparatus shadow-xs"
                title="Seal and save scenario to Vault (⌘S)"
              >
                <Save size={12} />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMarginOpen(!isMarginOpen)}
                className={`text-[11px] font-apparatus px-2.5 py-1 rounded-[2px] border transition-all flex items-center gap-1.5 ${
                  isMarginOpen
                    ? "bg-[var(--vellum-raised)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold"
                    : "bg-transparent border-[var(--ink-soft)] text-[var(--graphite)] hover:text-[var(--ink)] hover:border-[var(--graphite)]"
                }`}
                title="Toggle Right Margin Apparatus (Canon & Anchors)"
              >
                <Feather size={12} className="text-[var(--rubric)]" />
                <span className="hidden sm:inline">Margin Apparatus</span>
                <span className="sm:hidden">Margin</span>
                {parse?.nonNegotiables && parse.nonNegotiables.length > 0 && (
                  <span className="font-mono-ui text-[10px] px-1 py-0.2 rounded bg-[var(--ink-soft)] text-[var(--ink)]">
                    {parse.nonNegotiables.length}
                  </span>
                )}
                {canon.enabled && (
                  <span className="text-[9px] font-apparatus uppercase px-1 rounded bg-[var(--rubric)]/20 text-[var(--rubric)] font-semibold">
                    Canon
                  </span>
                )}
              </button>
            </div>
          </div>

          {currentStage === 1 && (
            <SparkStage
              sparkText={sparkText}
              onChangeSpark={setSparkText}
              onProceed={handleProceedToDivergence}
              isLoading={isLoadingDivergence || isParsingSpark}
              onAnalyzeMargin={handleAnalyzeSpark}
              isParsingMargin={isParsingSpark}
              hasParsedMargin={Boolean(parse && (parse.nonNegotiables.length > 0 || parse.registerWords.length > 0))}
              onOpenMargin={() => setIsMarginOpen(true)}
              settings={settings}
              onUpdateSettings={setSettings}
              generationActivity={(isParsingSpark ? anchorActivity : divergenceActivity).status !== "idle" ? {
                ...(isParsingSpark ? anchorActivity : divergenceActivity),
                task: isParsingSpark ? "anchors" : "divergence",
                onCancel: isParsingSpark ? handleCancelAnchors : handleCancelDivergence,
                onClearReasoning: () => isParsingSpark ? setAnchorActivity((state) => ({ ...state, reasoning: "", reasoningTruncated: false })) : setDivergenceActivity((state) => ({ ...state, reasoning: "", reasoningTruncated: false })),
                onOpenConnections: () => setIsSettingsOpen(true),
              } : undefined}
            />
          )}

          {currentStage === 2 && (
            <DivergenceStage
              takes={takes}
              selectedTakeId={selectedTakeId}
              onSelectTake={(take) => setSelectedTakeId(take.id)}
              onRerollAll={handleRerollDivergence}
              onPushFurther={handlePushFurther}
              onRerollSingleTake={handleRerollSingleTake}
              onSteerSingleTake={handleSteerSingleTake}
              onUpdateTake={handleUpdateTake}
              onSwitchTakeVersion={handleSwitchTakeVersion}
              rerollingSingleId={rerollingSingleId}
              onProceed={handleProceedToPhysics}
              isLoading={isLoadingDivergence}
              sparkText={sparkText}
              divergenceError={divergenceError}
              onRetry={handleProceedToDivergence}
              onOpenConnections={() => setIsSettingsOpen(true)}
              settings={settings}
              onUpdateSettings={setSettings}
              generationActivity={divergenceActivity.status !== "idle" ? { ...divergenceActivity, task: "divergence", onCancel: handleCancelDivergence, onClearReasoning: () => setDivergenceActivity((state) => ({ ...state, reasoning: "", reasoningTruncated: false })), onOpenConnections: () => setIsSettingsOpen(true) } : undefined}
            />
          )}

          {currentStage === 3 && (
            <PhysicsStage
              physics={physics}
              onChangePhysics={setPhysics}
              onProceed={handleStartForge}
              isCanonActive={canon.enabled}
              chosenTitle={chosenTake?.title || workingTitle}
            />
          )}

          {currentStage === 4 && (
            <ForgeStage
              buildLogs={buildLogs}
              streamedSections={streamedSections}
              isForging={isForging}
              document={document}
              onProceedToRefine={handleProceedToRefine}
              workingTitle={workingTitle}
              forgeError={forgeError}
              onRetryForge={handleStartForge}
              generationActivity={forgeActivity.status !== "idle" ? { ...forgeActivity, task: "forge", onCancel: handleCancelForge, onClearReasoning: () => setForgeActivity((state) => ({ ...state, reasoning: "", reasoningTruncated: false })), onOpenConnections: () => setIsSettingsOpen(true) } : undefined}
            />
          )}

          {currentStage === 5 && document && (
            <RefineStage
              document={document}
              settings={settings}
              onUpdateDocument={(updated) => {
                setDocument(updated);
                const existing = savedProjects.find((project) => project.document.id === updated.id);
                if (existing) {
                  const nextProject = captureSavedProject({
                    document: updated,
                    currentStage: 5,
                    maxUnlockedStage,
                    sparkText,
                    parse,
                    canon,
                    physics,
                    takes,
                    selectedTakeId,
                    settings,
                    provenance,
                  });
                  commitProjectStore(saveProjectToStore({ schemaVersion: 2, projects: savedProjects }, nextProject).projects);
                }
              }}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenConnections={() => setIsSettingsOpen(true)}
            />
          )}
        </main>

        {/* Persistent Docked Right Margin Panel on XL screens */}
        {isMarginOpen && (
          <div className="hidden xl:flex w-72 h-full shrink-0 border-l border-[var(--ink-soft)] flex-col overflow-hidden">
            <RightMarginPanel
              parse={parse}
              onUpdateParse={setParse}
              canon={canon}
              onUpdateCanon={setCanon}
              currentStage={currentStage}
              onClose={() => setIsMarginOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Floating / Slide-over Drawer for Margin Panel on screens < xl */}
      {isMarginOpen && (
        <div
          id="margin-drawer-backdrop"
          className="xl:hidden fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-ink-bleed"
          onClick={() => setIsMarginOpen(false)}
        >
          <div
            id="margin-drawer-sheet"
            className="relative w-[88vw] max-w-sm h-full max-h-[100dvh] shadow-2xl bg-[var(--vellum-deep)] border-l border-[var(--ink-soft)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <RightMarginPanel
              parse={parse}
              onUpdateParse={setParse}
              canon={canon}
              onUpdateCanon={setCanon}
              currentStage={currentStage}
              onClose={() => setIsMarginOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Drawer for SidebarRail on screens < md */}
      {isMobileNavOpen && (
        <div
          id="sidebar-mobile-backdrop"
          className="md:hidden fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs animate-ink-bleed"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            id="sidebar-mobile-sheet"
            className="relative w-64 max-w-[80vw] h-full max-h-[100dvh] shadow-2xl bg-[var(--vellum-deep)] border-r border-[var(--ink-soft)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarRail
              currentStage={currentStage}
              onSelectStage={(s) => {
                setCurrentStage(s);
                setIsMobileNavOpen(false);
              }}
              maxUnlockedStage={maxUnlockedStage}
              workingTitle={workingTitle}
              modelSummary={settings.modelSelection?.modelId || "Default Gemini / offline"}
              isDark={isDark}
              onToggleDark={() => setIsDark(!isDark)}
              onOpenVault={() => {
                setIsVaultOpen(true);
                setIsMobileNavOpen(false);
              }}
              savedCount={savedProjects.length}
              onOpenCommandPalette={() => {
                setIsCommandPaletteOpen(true);
                setIsMobileNavOpen(false);
              }}
              onOpenShortcuts={() => {
                setIsShortcutsOpen(true);
                setIsMobileNavOpen(false);
              }}
              onOpenOnboarding={() => {
                setIsOnboardingOpen(true);
                setIsMobileNavOpen(false);
              }}
              onOpenSettings={() => {
                setIsSettingsOpen(true);
                setIsMobileNavOpen(false);
              }}
              onNewScenario={() => {
                setIsMobileNavOpen(false);
                handlePromptNewScenario();
              }}
              onSaveScenario={() => {
                setIsMobileNavOpen(false);
                handleSaveCurrentScenario();
              }}
              onCloseMobile={() => setIsMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <VaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        savedProjects={savedProjects}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={handleRenameProject}
        currentDocumentId={document?.id}
        preparedGraphs={preparedGraphs}
        preparingProjectId={preparingGraphId}
        onPrepareGraph={handlePrepareGraph}
        onOpenGraph={handleOpenGraph}
      />

      {activeGraph && (
        <ProjectGraphPanel
          graph={activeGraph}
          preview={graphPreview}
          blueprintPlan={blueprintPlan}
          blueprintBusy={blueprintBusy}
          blueprintError={blueprintError}
          blueprintReloadRequired={blueprintReloadRequired}
          onPreviewBlueprint={handlePreviewBlueprint}
          onReloadBlueprint={handleReloadBlueprint}
          onOpenBlueprint={() => setIsBlueprintOpen(true)}
          onClose={() => {
            closeBlueprint();
            setActiveGraph(null);
            setGraphPreview(null);
          }}
          onRename={handleRenameGraphEntity}
          onReload={handleReloadGraph}
          onCompile={handleCompileGraph}
        />
      )}

      {isBlueprintOpen && blueprintPlan && <BlueprintPreviewPanel plan={blueprintPlan} onClose={closeBlueprint} />}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selection={settings.modelSelection || null}
        onSelectionChange={(modelSelection) => setSettings((current) => ({ ...current, modelSelection }))}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateStage={(s) => {
          if (s <= maxUnlockedStage) setCurrentStage(s);
        }}
        onOpenVault={() => setIsVaultOpen(true)}
        onToggleTheme={() => setIsDark(!isDark)}
        isDark={isDark}
        onNewScenario={handlePromptNewScenario}
        onOpenExport={() => setIsExportOpen(true)}
        hasDocument={!!document}
      />

      {document && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          document={document}
        />
      )}

      {/* Onboarding handwritten note overlay */}
      <OnboardingNote
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
      />

      {/* Keyboard shortcuts reference card */}
      <ShortcutsReferenceCard
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* New Scenario Confirmation Modal */}
      <NewScenarioModal
        isOpen={isNewScenarioModalOpen}
        onClose={() => setIsNewScenarioModalOpen(false)}
        onSaveAndStartNew={() => handleStartFreshScenario(true)}
        onDiscardAndStartNew={() => handleStartFreshScenario(false)}
        currentTitle={workingTitle}
      />

      {/* Wax Seal Stamp Animation Overlay */}
      <WaxSealStamp
        isActive={isWaxStampActive}
        onComplete={() => setIsWaxStampActive(false)}
        scenarioTitle={workingTitle}
      />

      {storageWarning && (
        <StorageRecoveryNotice
          message={storageWarning}
          onDismiss={() => setStorageWarning(null)}
        />
      )}

      {/* Tactile Manuscript Toast Notification */}
      {toastMessage && (
        <div
          id="manuscript-toast-badge"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] px-4 py-2 rounded shadow-xl flex items-center gap-2.5 animate-fade-in select-none"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--rubric)] animate-pulse" />
          <span className="text-xs font-apparatus text-[var(--ink)] tracking-wide">
            {toastMessage}
          </span>
        </div>
      )}
    </div>
  );
}
