import type {
  CanonConfig,
  DivergenceTake,
  GenerationProvenance,
  GenerationSettings,
  LoreBibleDocument,
  ModelSelection,
  PhysicsConfig,
  SparkParse,
} from "../types";

export interface SavedLoreBibleProjectV2 {
  schemaVersion: 2;
  document: LoreBibleDocument;
  workflow: {
    stage: string;
    maxUnlockedStage?: string;
    sparkParse: SparkParse | null;
    canon: CanonConfig;
    physics: PhysicsConfig;
    takes: DivergenceTake[];
    selectedTakeId: string | null;
  };
  generation: {
    settings: GenerationSettings;
    modelSelection: ModelSelection;
    provenance: GenerationProvenance[];
  };
  savedAt: string;
}

export interface SavedProjectStoreV2 {
  schemaVersion: 2;
  projects: SavedLoreBibleProjectV2[];
}

export interface ParsedProjectStorage {
  store: SavedProjectStoreV2;
  recoveryJson: string | null;
}

export interface ProjectStorageReadResult extends ParsedProjectStorage {
  recoveryKey: string | null;
  warning: string | null;
}

export interface ProjectStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PROJECT_STORE_V2_KEY = "lore_bible_saved_projects_v2";
export const LEGACY_PROJECT_STORE_KEY = "lore_bible_saved_scenarios_v1";
export const PROJECT_RECOVERY_KEY_PREFIX = "lore_bible_saved_projects_recovery_";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDocument(value: unknown): value is LoreBibleDocument {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && isRecord(value.core) && isRecord(value.parse);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
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

function isSettings(value: unknown): value is GenerationSettings {
  return isRecord(value)
    && (value.quality === "Fast" || value.quality === "Balanced" || value.quality === "Deep Craft")
    && (value.divergenceMode === "Faithful" || value.divergenceMode === "Exploratory" || value.divergenceMode === "Radical" || value.divergenceMode === "Unbound")
    && isRecord(value.authorFlavor);
}

function defaultSettings(): GenerationSettings {
  return {
    quality: "Deep Craft",
    divergenceMode: "Exploratory",
    authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible", manualAuthorId: null, overdriveEnabled: false },
    modelSelection: { profileId: null, modelId: null },
  };
}

function migrateDocument(document: LoreBibleDocument): SavedLoreBibleProjectV2 {
  return {
    schemaVersion: 2,
    document,
    workflow: {
      stage: "5",
      sparkParse: document.parse || null,
      canon: document.canon,
      physics: document.physics,
      takes: document.takes || (document.chosenTake ? [document.chosenTake] : []),
      selectedTakeId: document.chosenTake?.id || null,
    },
    generation: { settings: defaultSettings(), modelSelection: { profileId: null, modelId: null }, provenance: [] },
    savedAt: document.updatedAt || new Date().toISOString(),
  };
}

function validateProject(value: unknown): value is SavedLoreBibleProjectV2 {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isDocument(value.document) || !isRecord(value.workflow) || !isRecord(value.generation)) return false;
  const workflow = value.workflow;
  const generation = value.generation;
  const selection = generation.modelSelection;
  return typeof workflow.stage === "string"
    && (workflow.maxUnlockedStage === undefined || typeof workflow.maxUnlockedStage === "string")
    && (workflow.sparkParse === null || isRecord(workflow.sparkParse))
    && isRecord(workflow.canon)
    && isRecord(workflow.physics)
    && Array.isArray(workflow.takes)
    && workflow.takes.every(isTake)
    && isNullableString(workflow.selectedTakeId)
    && isSettings(generation.settings)
    && isRecord(selection)
    && isNullableString(selection.profileId)
    && isNullableString(selection.modelId)
    && Array.isArray(generation.provenance)
    && typeof value.savedAt === "string";
}

export function createSavedProjectV2(input: Omit<SavedLoreBibleProjectV2, "schemaVersion" | "savedAt"> & { savedAt?: string }): SavedLoreBibleProjectV2 {
  return { schemaVersion: 2, ...input, savedAt: input.savedAt || new Date().toISOString() };
}

export function serializeProjectStore(store: SavedProjectStoreV2): string {
  return JSON.stringify(store);
}

export function readProjectStore(storage: ProjectStorageLike, now: () => number = Date.now): ProjectStorageReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PROJECT_STORE_V2_KEY) ?? storage.getItem(LEGACY_PROJECT_STORE_KEY);
  } catch {
    return {
      store: { schemaVersion: 2, projects: [] },
      recoveryJson: null,
      recoveryKey: null,
      warning: "Saved-project storage is unavailable. Existing in-memory work remains available.",
    };
  }
  const parsed = parseProjectStorage(raw);
  if (!parsed.recoveryJson) return { ...parsed, recoveryKey: null, warning: null };

  const recoveryKey = `${PROJECT_RECOVERY_KEY_PREFIX}${now()}`;
  try {
    storage.setItem(recoveryKey, parsed.recoveryJson);
    return {
      ...parsed,
      recoveryKey,
      warning: "Saved project data was damaged. A recovery copy was preserved and the original data was left unchanged.",
    };
  } catch {
    return {
      ...parsed,
      recoveryKey: null,
      warning: "Saved project data was damaged and could not be copied. The original data was left unchanged.",
    };
  }
}

export function writeProjectStore(storage: ProjectStorageLike, store: SavedProjectStoreV2): void {
  try {
    storage.setItem(PROJECT_STORE_V2_KEY, serializeProjectStore(store));
  } catch (error) {
    throw new Error("Could not save projects. Existing in-memory work remains available.", { cause: error });
  }
}

export function parseProjectStorage(raw: string | null): ParsedProjectStorage {
  if (!raw) return { store: { schemaVersion: 2, projects: [] }, recoveryJson: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const projects = parsed.filter(isDocument).map(migrateDocument);
      if (projects.length !== parsed.length) throw new Error("legacy project list contains malformed documents");
      return { store: { schemaVersion: 2, projects }, recoveryJson: null };
    }
    if (isRecord(parsed) && parsed.schemaVersion === 2 && Array.isArray(parsed.projects) && parsed.projects.every(validateProject)) {
      return { store: parsed as unknown as SavedProjectStoreV2, recoveryJson: null };
    }
    throw new Error("unknown saved-project schema");
  } catch {
    return { store: { schemaVersion: 2, projects: [] }, recoveryJson: raw };
  }
}

export function saveProjectToStore(store: SavedProjectStoreV2, project: SavedLoreBibleProjectV2): SavedProjectStoreV2 {
  const projects = store.projects.some((item) => item.document.id === project.document.id)
    ? store.projects.map((item) => item.document.id === project.document.id ? project : item)
    : [project, ...store.projects];
  return { schemaVersion: 2, projects };
}

export function removeProjectFromStore(store: SavedProjectStoreV2, documentId: string): SavedProjectStoreV2 {
  return { schemaVersion: 2, projects: store.projects.filter((project) => project.document.id !== documentId) };
}
