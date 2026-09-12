import type {
  CanonConfig,
  DivergenceBoardGeneration,
  DivergenceTake,
  GenerationProvenance,
  GenerationSettings,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
} from "../types";
import { createSavedProjectV2, type SavedLoreBibleProjectV2 } from "./projectPersistence";
import { migrateLegacyDivergenceBoards } from "./divergenceBoards";
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
  divergenceBoards: DivergenceBoardGeneration[];
  activeDivergenceBoardId: string | null;
  settings: GenerationSettings;
  provenance: GenerationProvenance[];
}

export type ProjectWorkspaceCapture = Omit<ProjectWorkspaceState, "selectedTakeId" | "divergenceBoards" | "activeDivergenceBoardId"> & {
  selectedTakeId: string | null | undefined;
  divergenceBoards?: DivergenceBoardGeneration[];
  activeDivergenceBoardId?: string | null;
};

export interface ActiveWorkspaceState extends Omit<ProjectWorkspaceState, "document"> {
  document: LoreBibleDocument | null;
}

export type ActiveWorkspaceCapture = Omit<ActiveWorkspaceState, "selectedTakeId" | "divergenceBoards" | "activeDivergenceBoardId"> & {
  selectedTakeId: string | null | undefined;
  divergenceBoards?: DivergenceBoardGeneration[];
  activeDivergenceBoardId?: string | null;
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
  const boardState = migrateLegacyDivergenceBoards(state.divergenceBoards, state.takes, state.activeDivergenceBoardId);
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
      divergenceBoards: boardState.boards,
      activeDivergenceBoardId: boardState.activeBoardId,
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
  const boardState = migrateLegacyDivergenceBoards(project.workflow.divergenceBoards, takes, project.workflow.activeDivergenceBoardId);
  const activeTakes = boardState.boards.find((board) => board.id === boardState.activeBoardId)?.takes || takes;
  const selectedTakeId = selectExistingTakeId(activeTakes, project.workflow.selectedTakeId || project.document.chosenTake?.id);
  const modelSelection = project.generation.modelSelection || project.generation.settings.modelSelection || { profileId: null, modelId: null };
  return {
    document: project.document,
    currentStage,
    maxUnlockedStage,
    sparkText: project.document.sparkText || "",
    parse: project.workflow.sparkParse || project.document.parse || null,
    canon: project.workflow.canon || project.document.canon,
    physics: project.workflow.physics || project.document.physics,
    takes: activeTakes,
    selectedTakeId,
    divergenceBoards: boardState.boards,
    activeDivergenceBoardId: boardState.activeBoardId,
    settings: { ...project.generation.settings, modelSelection },
    provenance: project.generation.provenance || [],
  };
}

export function captureWorkspaceDraft(state: ActiveWorkspaceCapture, updatedAt = new Date().toISOString()): SavedWorkspaceDraftV2 {
  const boardState = migrateLegacyDivergenceBoards(state.divergenceBoards, state.takes, state.activeDivergenceBoardId);
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
      divergenceBoards: boardState.boards,
      activeDivergenceBoardId: boardState.activeBoardId,
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
  const boardState = migrateLegacyDivergenceBoards(draft.workflow.divergenceBoards, draft.workflow.takes, draft.workflow.activeDivergenceBoardId);
  const takes = boardState.boards.find((board) => board.id === boardState.activeBoardId)?.takes || draft.workflow.takes;
  const selectedTakeId = selectExistingTakeId(takes, draft.workflow.selectedTakeId);
  const modelSelection = draft.generation.modelSelection || draft.generation.settings.modelSelection || { profileId: null, modelId: null };
  return {
    document: draft.document,
    currentStage,
    maxUnlockedStage: Math.max(currentStage, maxUnlockedStage) as WorkflowStage,
    sparkText: draft.workflow.sparkText,
    parse: draft.workflow.sparkParse,
    canon: draft.workflow.canon,
    physics: draft.workflow.physics,
    takes,
    selectedTakeId,
    divergenceBoards: boardState.boards,
    activeDivergenceBoardId: boardState.activeBoardId,
    settings: { ...draft.generation.settings, modelSelection },
    provenance: draft.generation.provenance || [],
  };
}
