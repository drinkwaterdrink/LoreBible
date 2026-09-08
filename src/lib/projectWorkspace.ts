import type {
  CanonConfig,
  DivergenceTake,
  GenerationProvenance,
  GenerationSettings,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
} from "../types";
import { createSavedProjectV2, type SavedLoreBibleProjectV2 } from "./projectPersistence";
import type { SavedWorkspaceDraftV2, WorkflowStage } from "./workspacePersistence";

export interface ProjectWorkspaceState {
  document: LoreBibleDocument;
  currentStage: WorkflowStage;
  maxUnlockedStage: WorkflowStage;
  sparkText: string;
  parse: SparkParse | null;
  canon: CanonConfig;
  physics: PhysicsConfig;
  takes: DivergenceTake[];
  selectedTakeId: string | null;
  settings: GenerationSettings;
  provenance: GenerationProvenance[];
}

export type ProjectWorkspaceCapture = Omit<ProjectWorkspaceState, "selectedTakeId"> & {
  selectedTakeId: string | null | undefined;
};

export interface ActiveWorkspaceState extends Omit<ProjectWorkspaceState, "document"> {
  document: LoreBibleDocument | null;
}

export type ActiveWorkspaceCapture = Omit<ActiveWorkspaceState, "selectedTakeId"> & {
  selectedTakeId: string | null | undefined;
};

function normalizeStage(value: unknown, fallback: WorkflowStage): WorkflowStage {
  const stage = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(stage) && Number(stage) >= 1 && Number(stage) <= 5
    ? Number(stage) as WorkflowStage
    : fallback;
}

function selectExistingTakeId(takes: DivergenceTake[], selectedTakeId: string | null | undefined): string | null {
  if (selectedTakeId && takes.some((take) => take.id === selectedTakeId)) return selectedTakeId;
  return takes[0]?.id || null;
}

function hasForgedContent(document: LoreBibleDocument): boolean {
  return Boolean(
    document.core?.theRule
    || document.core?.theSituation
    || document.opening?.firstMessage
    || document.locations?.length
    || document.npcs?.length
    || document.secrets?.length
    || document.relationshipWeb?.length,
  );
}

export function restoredProjectStages(project: SavedLoreBibleProjectV2): { currentStage: WorkflowStage; maxUnlockedStage: WorkflowStage } {
  const storedStage = normalizeStage(project.workflow.stage, 5);
  if (project.workflow.maxUnlockedStage !== undefined) {
    const storedUnlocked = normalizeStage(project.workflow.maxUnlockedStage, storedStage);
    return { currentStage: storedStage, maxUnlockedStage: Math.max(storedStage, storedUnlocked) as WorkflowStage };
  }

  const inferredStage: WorkflowStage = hasForgedContent(project.document)
    ? 5
    : project.workflow.takes.length > 0
      ? 2
      : 1;
  const recoveredStage = Math.max(storedStage, inferredStage) as WorkflowStage;
  return { currentStage: recoveredStage, maxUnlockedStage: recoveredStage };
}

export function captureSavedProject(state: ProjectWorkspaceCapture): SavedLoreBibleProjectV2 {
  const selectedTakeId = selectExistingTakeId(state.takes, state.selectedTakeId);
  const chosenTake = state.takes.find((take) => take.id === selectedTakeId);
  const document: LoreBibleDocument = {
    ...state.document,
    sparkText: state.sparkText,
    parse: state.parse || state.document.parse,
    canon: state.canon,
    physics: state.physics,
    takes: state.takes,
    chosenTake,
    updatedAt: new Date().toISOString(),
  };
  const modelSelection = state.settings.modelSelection || { profileId: null, modelId: null };
  return createSavedProjectV2({
    document,
    workflow: {
      stage: String(state.currentStage),
      maxUnlockedStage: String(state.maxUnlockedStage),
      sparkParse: state.parse,
      canon: state.canon,
      physics: state.physics,
      takes: state.takes,
      selectedTakeId,
    },
    generation: {
      settings: { ...state.settings, modelSelection },
      modelSelection,
      provenance: state.provenance,
    },
  });
}

export function restoreSavedProject(project: SavedLoreBibleProjectV2): ProjectWorkspaceState {
  const { currentStage, maxUnlockedStage } = restoredProjectStages(project);
  const takes = project.workflow.takes.length > 0
    ? project.workflow.takes
    : project.document.takes || (project.document.chosenTake ? [project.document.chosenTake] : []);
  const selectedTakeId = selectExistingTakeId(takes, project.workflow.selectedTakeId || project.document.chosenTake?.id);
  const modelSelection = project.generation.modelSelection || project.generation.settings.modelSelection || { profileId: null, modelId: null };
  return {
    document: project.document,
    currentStage,
    maxUnlockedStage,
    sparkText: project.document.sparkText || "",
    parse: project.workflow.sparkParse || project.document.parse || null,
    canon: project.workflow.canon || project.document.canon,
    physics: project.workflow.physics || project.document.physics,
    takes,
    selectedTakeId,
    settings: { ...project.generation.settings, modelSelection },
    provenance: project.generation.provenance || [],
  };
}

export function captureWorkspaceDraft(state: ActiveWorkspaceCapture, updatedAt = new Date().toISOString()): SavedWorkspaceDraftV2 {
  const selectedTakeId = selectExistingTakeId(state.takes, state.selectedTakeId);
  const modelSelection = state.settings.modelSelection || { profileId: null, modelId: null };
  return {
    schemaVersion: 2,
    document: state.document,
    workflow: {
      currentStage: state.currentStage,
      maxUnlockedStage: state.maxUnlockedStage,
      sparkText: state.sparkText,
      sparkParse: state.parse,
      canon: state.canon,
      physics: state.physics,
      takes: state.takes,
      selectedTakeId,
    },
    generation: {
      settings: { ...state.settings, modelSelection },
      modelSelection,
      provenance: state.provenance,
    },
    updatedAt,
  };
}

export function restoreWorkspaceDraft(draft: SavedWorkspaceDraftV2): ActiveWorkspaceState {
  const currentStage = normalizeStage(draft.workflow.currentStage, 1);
  const maxUnlockedStage = normalizeStage(draft.workflow.maxUnlockedStage, currentStage);
  const selectedTakeId = selectExistingTakeId(draft.workflow.takes, draft.workflow.selectedTakeId);
  const modelSelection = draft.generation.modelSelection || draft.generation.settings.modelSelection || { profileId: null, modelId: null };
  return {
    document: draft.document,
    currentStage,
    maxUnlockedStage: Math.max(currentStage, maxUnlockedStage) as WorkflowStage,
    sparkText: draft.workflow.sparkText,
    parse: draft.workflow.sparkParse,
    canon: draft.workflow.canon,
    physics: draft.workflow.physics,
    takes: draft.workflow.takes,
    selectedTakeId,
    settings: { ...draft.generation.settings, modelSelection },
    provenance: draft.generation.provenance || [],
  };
}
