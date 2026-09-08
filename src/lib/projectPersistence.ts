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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDocument(value: unknown): value is LoreBibleDocument {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && isRecord(value.core) && isRecord(value.parse);
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
  return isRecord(value) && value.schemaVersion === 2 && isDocument(value.document) && isRecord(value.workflow) && isRecord(value.generation);
}

export function createSavedProjectV2(input: Omit<SavedLoreBibleProjectV2, "schemaVersion" | "savedAt"> & { savedAt?: string }): SavedLoreBibleProjectV2 {
  return { schemaVersion: 2, ...input, savedAt: input.savedAt || new Date().toISOString() };
}

export function serializeProjectStore(store: SavedProjectStoreV2): string {
  return JSON.stringify(store);
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
