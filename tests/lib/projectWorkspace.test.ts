import { expect, test } from "bun:test";
import { createSavedProjectV2 } from "../../src/lib/projectPersistence";
import { captureSavedProject, captureWorkspaceDraft, restoreSavedProject, restoreWorkspaceDraft } from "../../src/lib/projectWorkspace";

const parse = { franchise: null, nonNegotiables: ["Anchor"], registerWords: [], userRole: null, openNegotiables: [] } as any;
const canon = { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" } as any;
const physics = { density: "Standard", strangeness: 3, mundanity: 4 } as any;
const settings = {
  quality: "Balanced",
  divergenceMode: "Faithful",
  authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" },
  modelSelection: { profileId: "profile-a", modelId: "model-a" },
} as any;
const take = (id: string) => ({ id, title: id, pitch: `${id} pitch`, genreTone: "Warm", angle: "Social", retainedNonNegotiables: ["Anchor"] });
const selected = { ...take("take-3-current"), versions: [take("take-3-v1"), take("take-3-current")], versionIndex: 1 };
const document = {
  id: "doc-restore", title: "Restore Me", createdAt: "2026-01-01", updatedAt: "2026-01-02", sparkText: "Original spark",
  parse, canon, physics, core: { title: "Restore Me", pitch: "Original spark" },
} as any;

test("saved project restores its exact workflow, settings, and divergence history", () => {
  const project = createSavedProjectV2({
    document,
    workflow: {
      stage: "2",
      maxUnlockedStage: "4",
      sparkParse: parse,
      canon,
      physics,
      takes: [take("take-1"), take("take-2"), selected, take("take-4")],
      selectedTakeId: "take-3-current",
    },
    generation: { settings, modelSelection: settings.modelSelection, provenance: [] },
  });
  const restored = restoreSavedProject(project);
  expect(restored.currentStage).toBe(2);
  expect(restored.maxUnlockedStage).toBe(4);
  expect(restored.takes).toHaveLength(4);
  expect(restored.takes[2].versions).toHaveLength(2);
  expect(restored.selectedTakeId).toBe("take-3-current");
  expect(restored.settings).toEqual(settings);
});

test("missing selected take and malformed stage values normalize without losing the project", () => {
  const project = createSavedProjectV2({
    document,
    workflow: { stage: "99", sparkParse: parse, canon, physics, takes: [take("take-1")], selectedTakeId: "missing" },
    generation: { settings, modelSelection: settings.modelSelection, provenance: [] },
  });
  const restored = restoreSavedProject(project);
  expect(restored.currentStage).toBe(5);
  expect(restored.maxUnlockedStage).toBe(5);
  expect(restored.selectedTakeId).toBe("take-1");
});

test("captured project contains no secret-shaped fields", () => {
  const project = captureSavedProject({
    document,
    currentStage: 3,
    maxUnlockedStage: 4,
    sparkText: "Original spark",
    parse,
    canon,
    physics,
    takes: [selected],
    selectedTakeId: selected.id,
    settings,
    provenance: [],
  });
  expect(project.workflow.stage).toBe("3");
  expect(project.workflow.maxUnlockedStage).toBe("4");
  expect(JSON.stringify(project)).not.toContain("apiKey");
  expect(JSON.stringify(project)).not.toContain("secretCiphertext");
});

test("active pre-Forge workspace captures and restores without requiring a document", () => {
  const captured = captureWorkspaceDraft({
    document: null,
    currentStage: 2,
    maxUnlockedStage: 3,
    sparkText: "Unsaved mobile spark",
    parse,
    canon,
    physics,
    takes: [selected],
    selectedTakeId: selected.id,
    settings,
    provenance: [],
  }, "2026-09-08T13:00:00.000Z");
  const restored = restoreWorkspaceDraft(captured);
  expect(restored.document).toBeNull();
  expect(restored.currentStage).toBe(2);
  expect(restored.maxUnlockedStage).toBe(3);
  expect(restored.sparkText).toBe("Unsaved mobile spark");
  expect(restored.takes[0].versions).toHaveLength(2);
  expect(restored.settings.modelSelection).toEqual({ profileId: "profile-a", modelId: "model-a" });
});

test("legacy V2 project mislabeled Stage 1 reopens at Refine when forged content is present", () => {
  const forgedDocument = {
    ...document,
    core: { ...document.core, theRule: "A durable generated world rule" },
    opening: { firstMessage: "A playable opening" },
  };
  const project = createSavedProjectV2({
    document: forgedDocument,
    workflow: { stage: "1", sparkParse: parse, canon, physics, takes: [selected], selectedTakeId: selected.id },
    generation: { settings, modelSelection: settings.modelSelection, provenance: [] },
  });
  const restored = restoreSavedProject(project);
  expect(restored.currentStage).toBe(5);
  expect(restored.maxUnlockedStage).toBe(5);
});
