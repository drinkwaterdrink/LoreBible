import { expect, test } from "bun:test";
import {
  WORKSPACE_DRAFT_KEY,
  clearWorkspaceDraft,
  readWorkspaceDraft,
  writeWorkspaceDraft,
  type SavedWorkspaceDraftV2,
} from "../../src/lib/workspacePersistence";

function memoryStorage(initial: Record<string, string> = {}, failWrites = false) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) {
      if (failWrites) throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem(key: string) { values.delete(key); },
  };
}

const draft: SavedWorkspaceDraftV2 = {
  schemaVersion: 2,
  document: null,
  workflow: {
    currentStage: 2,
    maxUnlockedStage: 3,
    sparkText: "A mobile premise",
    sparkParse: { franchise: null, nonNegotiables: ["Keep this"], registerWords: [], userRole: null, openNegotiables: [] },
    canon: { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" },
    physics: { density: "Standard", strangeness: 3, mundanity: 4, violence: "Moderate", horror: "Psych", romance: "Subplot", humor: "Dry", pacing: "Measured", explicitContent: "Fade", playerDeath: "Only if earned", linguisticBase: "", mustInclude: "", mustAvoid: "" },
    takes: [{
      id: "take-current", title: "Current", pitch: "Current pitch", genreTone: "Warm", angle: "Social", retainedNonNegotiables: ["Keep this"], versionIndex: 1,
      versions: [
        { id: "take-v1", title: "First", pitch: "First pitch", genreTone: "Warm", angle: "Social", retainedNonNegotiables: ["Keep this"] },
        { id: "take-current", title: "Current", pitch: "Current pitch", genreTone: "Warm", angle: "Social", retainedNonNegotiables: ["Keep this"] },
      ],
    }],
    selectedTakeId: "take-current",
  },
  generation: {
    settings: { quality: "Balanced", divergenceMode: "Faithful", authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" }, modelSelection: { profileId: "profile-1", modelId: "model-1" } },
    modelSelection: { profileId: "profile-1", modelId: "model-1" },
    provenance: [],
  },
  updatedAt: "2026-09-08T12:00:00.000Z",
};

test("active workspace round-trips stage, settings, and take history without secrets", () => {
  const storage = memoryStorage();
  writeWorkspaceDraft(storage, draft);
  const restored = readWorkspaceDraft(storage, () => 100);
  expect(restored.draft).toEqual(draft);
  expect(restored.draft?.workflow.takes[0].versions).toHaveLength(2);
  expect(restored.draft?.generation.settings.modelSelection).toEqual({ profileId: "profile-1", modelId: "model-1" });
  expect(storage.getItem(WORKSPACE_DRAFT_KEY)).not.toContain("apiKey");
  expect(storage.getItem(WORKSPACE_DRAFT_KEY)).not.toContain("secretCiphertext");
});

test("corrupt workspace is quarantined without overwriting the original", () => {
  const raw = "not-json";
  const storage = memoryStorage({ [WORKSPACE_DRAFT_KEY]: raw });
  const restored = readWorkspaceDraft(storage, () => 777);
  expect(restored.draft).toBeNull();
  expect(restored.recoveryKey).toBe("lore_bible_active_workspace_recovery_777");
  expect(storage.getItem(restored.recoveryKey!)).toBe(raw);
  expect(storage.getItem(WORKSPACE_DRAFT_KEY)).toBe(raw);
});

test("workspace clear is explicit and failed writes remain visible to callers", () => {
  const storage = memoryStorage();
  writeWorkspaceDraft(storage, draft);
  clearWorkspaceDraft(storage);
  expect(storage.getItem(WORKSPACE_DRAFT_KEY)).toBeNull();

  const failing = memoryStorage({ [WORKSPACE_DRAFT_KEY]: "previous" }, true);
  expect(() => writeWorkspaceDraft(failing, draft)).toThrow("Could not save the active workspace");
  expect(failing.getItem(WORKSPACE_DRAFT_KEY)).toBe("previous");
});

test("an unavailable workspace store returns a warning instead of crashing startup", () => {
  const storage = {
    getItem() { throw new DOMException("Access denied", "SecurityError"); },
    setItem() { throw new DOMException("Access denied", "SecurityError"); },
    removeItem() { throw new DOMException("Access denied", "SecurityError"); },
  };
  const result = readWorkspaceDraft(storage);
  expect(result.draft).toBeNull();
  expect(result.warning).toContain("unavailable");
});
