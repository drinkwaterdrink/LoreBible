import React, { useState, useEffect, useRef } from "react";
import {
  CanonConfig,
  DivergenceTake,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
  BuildLogItem,
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
import { Menu, Feather, X, PlusCircle, Save } from "lucide-react";

const STORAGE_KEY_SCENARIOS = "lore_bible_saved_scenarios_v1";
const STORAGE_KEY_CURRENT = "lore_bible_current_working_draft_v1";
const STORAGE_KEY_THEME = "lore_bible_theme_mode_v1";

const DEFAULT_PHYSICS: PhysicsConfig = {
  density: "Standard",
  strangeness: 3,
  mundanity: 4,
  violence: "Moderate",
  horror: "Psych",
  romance: "Subplot",
  humor: "Dry and situational",
  pacing: "Slow burn",
  explicitContent: "Fade",
  playerDeath: "Only if earned",
  linguisticBase: "",
  mustInclude: "",
  mustAvoid: "",
};

const DEFAULT_CANON: CanonConfig = {
  enabled: false,
  franchiseName: null,
  fidelity: "Adjacent",
  explanation: "Suspends naming ban, preserves setting logistics.",
};

function createDraftScenarioDocument(params: {
  sparkText: string;
  parse: SparkParse | null;
  canon: CanonConfig;
  physics: PhysicsConfig;
  chosenTake?: DivergenceTake;
  takes?: DivergenceTake[];
  title?: string;
}): LoreBibleDocument {
  const { sparkText, parse, canon, physics, chosenTake, takes, title } = params;
  const safeTitle = title || chosenTake?.title || (sparkText ? sparkText.slice(0, 36) : "Untitled Scenario");
  const defaultParse: SparkParse = parse || {
    franchise: canon.franchiseName || null,
    nonNegotiables: [],
    registerWords: ["grounded"],
    userRole: null,
    openNegotiables: [],
  };

  return {
    id: "draft-" + Date.now(),
    title: safeTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sparkText,
    parse: defaultParse,
    canon,
    physics,
    chosenTake,
    takes,
    core: {
      title: safeTitle,
      pitch: chosenTake?.pitch || sparkText,
      genreTone: chosenTake?.genreTone || "Unclassified",
      eraScale: "In progress",
      theRule: "",
      theCost: "",
      theSituation: sparkText,
      thePressure: "",
      theQuestion: "",
      permanence: "P",
    },
    user: {
      rolePosition: defaultParse.userRole || "{{user}}",
      startsWith: "Current kit and immediate concerns",
      wants: "To survive and achieve independence",
      fears: "Being exposed or bound",
      hookPull: "An irresistible lead or offer",
      hookPush: "Sudden eviction or threat",
      hookTrap: "An institutional obligation",
      permanence: "P",
    },
    worldPhysics: {
      rules: [],
      authorityCheck: "Strict compliance",
      powerCeiling: "Human biological limits",
      faultLines: [],
      permanence: "C",
    },
    status: {
      content: "Drafting desk",
      settings: "Standard",
      permanence: "P",
    },
    locations: [],
    factions: [],
    npcs: [],
    relationshipWeb: [],
    knowledgeMap: [],
    items: [],
    secrets: [],
    conflict: {
      central: "Struggle against institutional inertia",
      opposition: "The governing authority",
      stakesBad: "Complete liquidation",
      stakesAcceptable: "Hard-fought parity",
      clock: "Ticking timeline",
      moralKnot: "Complicity versus survival",
      theYield: "A hard-won secret",
      speedBumps: [],
      permanence: "P",
    },
    pressureProtocol: "Escalating bureaucratic enforcement",
    history: [],
    aesthetic: {
      colors: ["Iron gray", "Vellum", "Soot"],
      sounds: ["Paper rustle", "Distant bells"],
      smells: ["Ink", "Rain on stone"],
      weather: "Overcast",
      visualMotifs: ["Wax seals", "Ledgers"],
      fashion: "Utilitarian coats",
      touchstones: ["Low fantasy", "Bureaucratic tension"],
      permanence: "C",
    },
    naming: {
      linguisticBase: physics.linguisticBase || "Anglo-Continental",
      commonNames: [],
      eliteNames: [],
      placeNamePattern: "Descriptive compound nouns",
      permanence: "C",
    },
    pressures: [],
    proceduralRolls: [],
    opening: {
      firstLocation: "Intake lobby",
      firstNpc: "Intake proctor",
      firstChoice: "Present credentials or stall",
      style: "Second-person present, immersive sensory",
      firstMessage: sparkText,
      permanence: "T",
    },
    expansionNotes: {
      explicit: "No",
      violence: physics.violence || "Moderate",
      horror: physics.horror || "Psych",
      romance: physics.romance || "Subplot",
      humor: "Dry",
      pacing: physics.pacing || "Deliberate",
      playerDeath: "Possible under failure states",
      contentFlags: [],
      allCharactersAdult: true,
      permanence: "P",
    },
    antiGravity: {
      temptations: [
        { temptation: "Model voice fluff", counter: "Use concrete physical nouns" },
      ],
      permanence: "P",
    },
    buildNotes: {
      permanenceRouting: "Core and User are permanent; seeds are contextual",
      orderBands: "Strict chronological progression",
      disabledUntilEarnedList: [],
      formatMatch: "100%",
      permanence: "P",
    },
  };
}

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_THEME) === "dark";
  });

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
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Spark state
  const [sparkText, setSparkText] = useState<string>(
    "hunter academy where the scholarship is an execution sentence"
  );
  const [parse, setParse] = useState<SparkParse>({
    franchise: "Hunter x Hunter",
    nonNegotiables: ["hunter academy", "scholarship as execution sentence"],
    registerWords: ["unhinged", "taut", "grim"],
    userRole: "impoverished applicant",
    openNegotiables: [
      "The true purpose of the preliminary stamina test",
      "Which proctor secretly owes money to the applicants' parish",
    ],
  });
  const [isParsingSpark, setIsParsingSpark] = useState(false);

  // Canon state
  const [canon, setCanon] = useState<CanonConfig>({
    enabled: true,
    franchiseName: "Hunter x Hunter",
    fidelity: "Adjacent",
    explanation: "Suspends naming ban, preserves setting logistics.",
  });

  // Divergence state
  const [takes, setTakes] = useState<DivergenceTake[]>([]);
  const [selectedTakeId, setSelectedTakeId] = useState<string | undefined>(undefined);
  const [isLoadingDivergence, setIsLoadingDivergence] = useState(false);
  const [rerollingSingleId, setRerollingSingleId] = useState<string | null>(null);
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  // Physics state
  const [physics, setPhysics] = useState<PhysicsConfig>(DEFAULT_PHYSICS);

  // Document & Forge state
  const [document, setDocument] = useState<LoreBibleDocument | null>(null);
  const [streamedSections, setStreamedSections] = useState<Record<string, any>>({});
  const [buildLogs, setBuildLogs] = useState<BuildLogItem[]>([]);
  const [isForging, setIsForging] = useState(false);
  const [forgeError, setForgeError] = useState<string | null>(null);

  // Vault & Modals
  const [savedScenarios, setSavedScenarios] = useState<LoreBibleDocument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SCENARIOS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isVaultOpen, setIsVaultOpen] = useState(false);
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

  // Explicit Margin Inking handler (User presses button when finished writing)
  const handleAnalyzeSpark = async () => {
    if (!sparkText.trim()) return;
    setIsParsingSpark(true);
    try {
      const parsed = await parseSparkApi(sparkText);
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
      triggerToast("Margin Apparatus inked and analyzed from premise.");
    } catch (err) {
      console.error("Manual spark analyze error:", err);
      triggerToast("Unable to reach AI analyzer; offline template preserved.");
    } finally {
      setIsParsingSpark(false);
    }
  };

  // Explicit Save Scenario handler with wax seal animation
  const handleSaveCurrentScenario = () => {
    const title = workingTitle;

    if (document) {
      const updatedDoc: LoreBibleDocument = {
        ...document,
        title,
        updatedAt: new Date().toISOString(),
      };
      setDocument(updatedDoc);
      setSavedScenarios((prev) => {
        const exists = prev.some((d) => d.id === updatedDoc.id);
        if (exists) {
          return prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
        }
        return [updatedDoc, ...prev];
      });
    } else {
      // Save draft scenario from current stage
      const draftDoc = createDraftScenarioDocument({
        sparkText,
        parse,
        canon,
        physics,
        chosenTake,
        takes,
        title,
      });
      setDocument(draftDoc);
      setSavedScenarios((prev) => [draftDoc, ...prev]);
    }
    setIsWaxStampActive(true);
    triggerToast("Manuscript sealed & preserved in the Vault.");
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
      handleSaveCurrentScenario();
    }
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

  // Auto-save saved scenarios to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCENARIOS, JSON.stringify(savedScenarios));
  }, [savedScenarios]);

  // Proceed from Stage 1 (SPARK) -> Stage 2 (DIVERGENCE)
  const handleProceedToDivergence = async () => {
    if (!sparkText.trim()) return;
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      // Ensure parse is ready
      let currentParse = parse;
      if (!currentParse || currentParse.nonNegotiables.length === 0) {
        currentParse = await parseSparkApi(sparkText);
        setParse(currentParse);
      }

      const generatedTakes = await fetchDivergenceTakes(sparkText, currentParse, canon);
      const initializedTakes = generatedTakes.map((take) => ({
        ...take,
        versions: [take],
        versionIndex: 0,
      }));
      setTakes(initializedTakes);
      if (initializedTakes.length > 0) {
        setSelectedTakeId(initializedTakes[0].id);
      }
      setCurrentStage(2);
      setMaxUnlockedStage((prev) => (prev < 2 ? 2 : prev));
    } catch (err: any) {
      console.error("Proceed to divergence error:", err);
      setDivergenceError(err?.message || "Failed to generate divergence angles.");
      setCurrentStage(2);
    } finally {
      setIsLoadingDivergence(false);
    }
  };

  // Reroll all divergence takes
  const handleRerollDivergence = async () => {
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      const freshTakes = await fetchDivergenceTakes(sparkText, parse, canon);
      const initializedTakes = freshTakes.map((freshTake, idx) => {
        const prevTake = takes[idx];
        const prevVersions = prevTake?.versions || (prevTake ? [prevTake] : []);
        const newVersions = [...prevVersions, freshTake];
        return {
          ...freshTake,
          versions: newVersions,
          versionIndex: newVersions.length - 1,
        };
      });
      setTakes(initializedTakes);
      if (initializedTakes.length > 0) {
        setSelectedTakeId(initializedTakes[0].id);
      }
    } catch (err: any) {
      console.error("Reroll divergence error:", err);
      setDivergenceError(err?.message || "Failed to reroll divergence angles.");
    } finally {
      setIsLoadingDivergence(false);
    }
  };

  // Push further from a specific take across 4 variations
  const handlePushFurther = async (take: DivergenceTake, pushInstruction: string) => {
    setIsLoadingDivergence(true);
    setDivergenceError(null);
    try {
      const branchedTakes = await fetchDivergenceTakes(sparkText, parse, canon, pushInstruction);
      const initialized = branchedTakes.map((bTake) => ({
        ...bTake,
        versions: [bTake],
        versionIndex: 0,
      }));
      setTakes(initialized);
      if (initialized.length > 0) {
        setSelectedTakeId(initialized[0].id);
      }
    } catch (err: any) {
      console.error("Push further error:", err);
      setDivergenceError(err?.message || "Failed to push premise angle.");
    } finally {
      setIsLoadingDivergence(false);
    }
  };

  // Reroll single individual angle
  const handleRerollSingleTake = async (targetTake: DivergenceTake) => {
    setRerollingSingleId(targetTake.id);
    setDivergenceError(null);
    try {
      let currentParse = parse;
      if (!currentParse || currentParse.nonNegotiables.length === 0) {
        currentParse = await parseSparkApi(sparkText);
        setParse(currentParse);
      }
      const freshTake = await fetchSingleDivergenceTake({
        sparkText,
        parse: currentParse,
        canon,
        targetAngle: targetTake.angle,
        currentTake: targetTake,
      });

      const prevVersions = targetTake.versions && targetTake.versions.length > 0
        ? targetTake.versions
        : [targetTake];
      const newVersions = [...prevVersions, freshTake];
      const takeWithHistory: DivergenceTake = {
        ...freshTake,
        versions: newVersions,
        versionIndex: newVersions.length - 1,
      };

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
        currentParse = await parseSparkApi(sparkText);
        setParse(currentParse);
      }
      const steeredTake = await fetchSingleDivergenceTake({
        sparkText,
        parse: currentParse,
        canon,
        targetAngle: targetTake.angle,
        currentTake: targetTake,
        steerInstruction,
      });

      const steeredWithNote: DivergenceTake = {
        ...steeredTake,
        steerNote: steerInstruction,
      };

      const prevVersions = targetTake.versions && targetTake.versions.length > 0
        ? targetTake.versions
        : [targetTake];
      const newVersions = [...prevVersions, steeredWithNote];
      const takeWithHistory: DivergenceTake = {
        ...steeredWithNote,
        versions: newVersions,
        versionIndex: newVersions.length - 1,
      };

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

        const prevVersions = t.versions || [t];
        const editedSnapshot: DivergenceTake = {
          ...updatedTake,
          id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          isEdited: true,
        };
        const newVersions = [...prevVersions, editedSnapshot];
        const finalTake: DivergenceTake = {
          ...editedSnapshot,
          versions: newVersions,
          versionIndex: newVersions.length - 1,
        };

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
          setMaxUnlockedStage(5);
          // Auto-save to vault
          setSavedScenarios((prev) => {
            const filtered = prev.filter((item) => item.id !== doc.id);
            return [doc, ...filtered];
          });
        },
        onError: (err) => {
          console.error("Forge error:", err);
          setForgeError(err);
          setIsForging(false);
        },
      }
    );
  };

  // Proceed from Stage 4 (FORGE) -> Stage 5 (REFINE)
  const handleProceedToRefine = () => {
    setCurrentStage(5);
  };

  // Vault Actions
  const handleLoadScenario = (scenario: LoreBibleDocument) => {
    setDocument(scenario);
    setSparkText(scenario.sparkText || "");
    if (scenario.parse) setParse(scenario.parse);
    if (scenario.canon) setCanon(scenario.canon);
    if (scenario.physics) setPhysics(scenario.physics);
    if (scenario.chosenTake) {
      setTakes([scenario.chosenTake]);
      setSelectedTakeId(scenario.chosenTake.id);
    }
    setCurrentStage(5);
    setMaxUnlockedStage(5);
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDuplicateScenario = (scenario: LoreBibleDocument) => {
    const duplicated: LoreBibleDocument = {
      ...scenario,
      id: "doc-" + Date.now(),
      title: `${scenario.core?.title || scenario.title} (Copy)`,
      core: {
        ...scenario.core,
        title: `${scenario.core?.title || scenario.title} (Copy)`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSavedScenarios((prev) => [duplicated, ...prev]);
  };

  const handleRenameScenario = (id: string, newTitle: string) => {
    setSavedScenarios((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            title: newTitle,
            core: { ...item.core, title: newTitle },
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );
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

  const handleNewScenario = () => {
    setSparkText("");
    setParse({
      franchise: null,
      nonNegotiables: [],
      registerWords: ["grounded"],
      userRole: null,
      openNegotiables: [],
    });
    setCanon(DEFAULT_CANON);
    setTakes([]);
    setSelectedTakeId(undefined);
    setPhysics(DEFAULT_PHYSICS);
    setDocument(null);
    setStreamedSections({});
    setBuildLogs([]);
    setCurrentStage(1);
    setMaxUnlockedStage(1);
  };

  return (
    <div className="h-screen w-full flex flex-col relative bg-[var(--vellum)] text-[var(--ink)] overflow-hidden">
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
          <span>§ LORE BIBLE</span>
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
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
            onOpenVault={() => setIsVaultOpen(true)}
            savedCount={savedScenarios.length}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
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
            />
          )}

          {currentStage === 5 && document && (
            <RefineStage
              document={document}
              onUpdateDocument={(updated) => {
                setDocument(updated);
                setSavedScenarios((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }}
              onOpenExport={() => setIsExportOpen(true)}
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
              isDark={isDark}
              onToggleDark={() => setIsDark(!isDark)}
              onOpenVault={() => {
                setIsVaultOpen(true);
                setIsMobileNavOpen(false);
              }}
              savedCount={savedScenarios.length}
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
        savedScenarios={savedScenarios}
        onLoadScenario={handleLoadScenario}
        onDeleteScenario={handleDeleteScenario}
        onDuplicateScenario={handleDuplicateScenario}
        onRenameScenario={handleRenameScenario}
        currentDocumentId={document?.id}
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
