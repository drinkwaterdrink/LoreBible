import type {
  CanonConfig,
  DivergenceBoardGeneration,
  DivergenceTake,
  GenerationProvenance,
  GenerationSettings,
  LoreBibleDocument,
  ModelSelection,
  PhysicsConfig,
  SparkParse,
} from "../types";
import { parseBlueprintSelectionV1, type BlueprintSelectionV1 } from "../contracts/blueprintSelection";

export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export interface SavedWorkspaceDraftV2 {
  schemaVersion: 2;
  document: LoreBibleDocument | null;
  workflow: {
    currentStage: WorkflowStage;
    maxUnlockedStage: WorkflowStage;
    sparkText: string;
    sparkParse: SparkParse | null;
    canon: CanonConfig;
    physics: PhysicsConfig;
    takes: DivergenceTake[];
    selectedTakeId: string | null;
    divergenceBoards?: DivergenceBoardGeneration[];
    activeDivergenceBoardId?: string | null;
    blueprintSelection?: BlueprintSelectionV1 | null;
  };
  generation: {
    settings: GenerationSettings;
    modelSelection: ModelSelection;
    provenance: GenerationProvenance[];
  };
  updatedAt: string;
}

export interface WorkspaceStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkspaceDraftReadResult {
  draft: SavedWorkspaceDraftV2 | null;
  recoveryKey: string | null;
  warning: string | null;
}

export const WORKSPACE_DRAFT_KEY = "lore_bible_active_workspace_v2";
export const WORKSPACE_RECOVERY_KEY_PREFIX = "lore_bible_active_workspace_recovery_";
const PROHIBITED_STORAGE_FIELDS = /"(?:apiKey|secretCiphertext|ciphertext)"\s*:/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isStage(value: unknown): value is WorkflowStage {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

function isTake(value: unknown): value is DivergenceTake {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.pitch === "string"
    && typeof value.genreTone === "string"
    && typeof value.angle === "string"
    && Array.isArray(value.retainedNonNegotiables);
}

function isDivergenceBoard(value: unknown): value is DivergenceBoardGeneration {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.createdAt === "string"
    && (value.operation === "initial" || value.operation === "reroll_all")
    && Array.isArray(value.takes)
    && value.takes.every(isTake);
}

function isDocument(value: unknown): value is LoreBibleDocument {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.sparkText === "string"
    && isRecord(value.core);
}

function isSettings(value: unknown): value is GenerationSettings {
  if (!isRecord(value) || !isRecord(value.authorFlavor)) return false;
  return (value.quality === "Fast" || value.quality === "Balanced" || value.quality === "Deep Craft")
    && (value.divergenceMode === "Faithful" || value.divergenceMode === "Exploratory" || value.divergenceMode === "Radical" || value.divergenceMode === "Unbound")
    && (value.authorFlavor.mode === "Off" || value.authorFlavor.mode === "Auto" || value.authorFlavor.mode === "Manual");
}

function isWorkspaceDraft(value: unknown): value is SavedWorkspaceDraftV2 {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isRecord(value.workflow) || !isRecord(value.generation)) return false;
  const workflow = value.workflow;
  const generation = value.generation;
  const selection = generation.modelSelection;
  return (value.document === null || isDocument(value.document))
    && isStage(workflow.currentStage)
    && isStage(workflow.maxUnlockedStage)
    && typeof workflow.sparkText === "string"
    && (workflow.sparkParse === null || isRecord(workflow.sparkParse))
    && isRecord(workflow.canon)
    && isRecord(workflow.physics)
    && Array.isArray(workflow.takes)
    && workflow.takes.every(isTake)
    && isNullableString(workflow.selectedTakeId)
    && (workflow.divergenceBoards === undefined || (Array.isArray(workflow.divergenceBoards) && workflow.divergenceBoards.every(isDivergenceBoard)))
    && (workflow.activeDivergenceBoardId === undefined || isNullableString(workflow.activeDivergenceBoardId))
    && (workflow.blueprintSelection === undefined || workflow.blueprintSelection === null || parseBlueprintSelectionV1(workflow.blueprintSelection).ok)
    && isSettings(generation.settings)
    && isRecord(selection)
    && isNullableString(selection.profileId)
    && isNullableString(selection.modelId)
    && Array.isArray(generation.provenance)
    && typeof value.updatedAt === "string";
}

export function readWorkspaceDraft(storage: WorkspaceStorageLike, now: () => number = Date.now): WorkspaceDraftReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_DRAFT_KEY);
  } catch {
    return {
      draft: null,
      recoveryKey: null,
      warning: "Active-workspace storage is unavailable. Reload recovery is paused, but editing remains available.",
    };
  }
  if (!raw) return { draft: null, recoveryKey: null, warning: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkspaceDraft(parsed)) throw new Error("unknown active-workspace schema");
    return { draft: parsed, recoveryKey: null, warning: null };
  } catch {
    const recoveryKey = `${WORKSPACE_RECOVERY_KEY_PREFIX}${now()}`;
    try {
      storage.setItem(recoveryKey, raw);
      return {
        draft: null,
        recoveryKey,
        warning: "The active workspace draft was damaged. A recovery copy was preserved and the original data was left unchanged.",
      };
    } catch {
      return {
        draft: null,
        recoveryKey: null,
        warning: "The active workspace draft was damaged and could not be copied. The original data was left unchanged.",
      };
    }
  }
}

export function writeWorkspaceDraft(storage: WorkspaceStorageLike, draft: SavedWorkspaceDraftV2): void {
  try {
    const serialized = JSON.stringify(draft);
    if (PROHIBITED_STORAGE_FIELDS.test(serialized)) throw new Error("workspace contains a prohibited secret field");
    storage.setItem(WORKSPACE_DRAFT_KEY, serialized);
  } catch (error) {
    throw new Error("Could not save the active workspace. Existing in-memory work remains available.", { cause: error });
  }
}

export function clearWorkspaceDraft(storage: WorkspaceStorageLike): void {
  storage.removeItem(WORKSPACE_DRAFT_KEY);
}
