import { expect, test } from "bun:test";
import {
  PROJECT_STORE_V2_KEY,
  createSavedProjectV2,
  parseProjectStorage,
  readProjectStore,
  removeProjectFromStore,
  saveProjectToStore,
  writeProjectStore,
} from "../../src/lib/projectPersistence";

function memoryStorage(initial: Record<string, string> = {}, failWrites = false) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) {
      if (failWrites) throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem(key: string) { values.delete(key); },
    keys() { return [...values.keys()]; },
  };
}

const document = {
  id: "doc-1", title: "Test", createdAt: "2026-01-01", updatedAt: "2026-01-02", sparkText: "A premise", parse: { franchise: null, nonNegotiables: [], registerWords: [], userRole: null, openNegotiables: [] }, canon: { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" }, physics: { density: "Standard", strangeness: 3, mundanity: 4, violence: "Moderate", horror: "Psych", romance: "Subplot", humor: "Dry", pacing: "Measured", explicitContent: "Fade", playerDeath: "Only if earned", linguisticBase: "", mustInclude: "", mustAvoid: "" }, core: { title: "Test", pitch: "A premise", genreTone: "", eraScale: "", theRule: "", theCost: "", theSituation: "", thePressure: "", theQuestion: "", permanence: "P" }, user: { rolePosition: "{{user}}", startsWith: "", wants: "", fears: "", hookPull: "", hookPush: "", hookTrap: "", permanence: "P" }, worldPhysics: { rules: [], authorityCheck: "", powerCeiling: "", faultLines: [], permanence: "C" }, status: { content: "", settings: "", permanence: "P" }, locations: [], factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], secrets: [], conflict: { central: "", opposition: "", stakesBad: "", stakesAcceptable: "", clock: "", moralKnot: "", theYield: "", speedBumps: [], permanence: "P" }, pressureProtocol: "", history: [], aesthetic: { colors: [], sounds: [], smells: [], weather: "", visualMotifs: [], fashion: "", touchstones: [], permanence: "C" }, naming: { linguisticBase: "", commonNames: [], eliteNames: [], placeNamePattern: "", permanence: "C" }, pressures: [], proceduralRolls: [], opening: { firstLocation: "", firstNpc: "", firstChoice: "", style: "", firstMessage: "", permanence: "T" }, expansionNotes: { explicit: "No", violence: "Moderate", horror: "", romance: "", humor: "", pacing: "", playerDeath: "", contentFlags: [], allCharactersAdult: true, permanence: "P" }, antiGravity: { temptations: [], permanence: "P" }, buildNotes: { permanenceRouting: "", orderBands: "", disabledUntilEarnedList: [], formatMatch: "", permanence: "P" },
} as any;

test("migrates the v1 document array without losing the document", () => {
  const parsed = parseProjectStorage(JSON.stringify([document]));
  expect(parsed.recoveryJson).toBeNull();
  expect(parsed.store.schemaVersion).toBe(2);
  expect(parsed.store.projects[0].document.id).toBe("doc-1");
  expect(parsed.store.projects[0].generation.modelSelection).toEqual({ profileId: null, modelId: null });
});

test("quarantines corrupt storage instead of replacing it with an empty array", () => {
  const raw = "{not-json";
  const parsed = parseProjectStorage(raw);
  expect(parsed.store.projects).toHaveLength(0);
  expect(parsed.recoveryJson).toBe(raw);
});

test("project updates are versioned and contain no API-key fields", () => {
  const project = createSavedProjectV2({ document, workflow: { stage: "2", sparkParse: document.parse, canon: document.canon, physics: document.physics, takes: [], selectedTakeId: null }, generation: { settings: { ...({ quality: "Fast", divergenceMode: "Faithful", authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" } } as any), modelSelection: { profileId: "p1", modelId: "z-ai/glm-5.3" } }, modelSelection: { profileId: "p1", modelId: "z-ai/glm-5.3" }, provenance: [] } });
  const store = saveProjectToStore({ schemaVersion: 2, projects: [] }, project);
  expect(JSON.stringify(store)).not.toContain("apiKey");
  expect(JSON.stringify(store)).not.toContain("secretCiphertext");
  expect(removeProjectFromStore(store, "doc-1").projects).toHaveLength(0);
});

test("storage boundary migrates a legacy list and preserves complete V2 project state", () => {
  const legacyStorage = memoryStorage({ lore_bible_saved_scenarios_v1: JSON.stringify([document]) });
  const migrated = readProjectStore(legacyStorage, () => 100);
  expect(migrated.store.projects[0].workflow.stage).toBe("5");

  const project = createSavedProjectV2({
    document,
    workflow: {
      stage: "2",
      sparkParse: document.parse,
      canon: document.canon,
      physics: document.physics,
      takes: [{ id: "take-1", title: "Angle", pitch: "Pitch", genreTone: "Warm", angle: "Social", retainedNonNegotiables: [], versions: [] }],
      selectedTakeId: "take-1",
    },
    generation: {
      settings: { quality: "Balanced", divergenceMode: "Faithful", authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" }, modelSelection: { profileId: "profile-1", modelId: "model-1" } },
      modelSelection: { profileId: "profile-1", modelId: "model-1" },
      provenance: [],
    },
  });
  writeProjectStore(legacyStorage, { schemaVersion: 2, projects: [project] });
  const restored = readProjectStore(legacyStorage, () => 101);
  expect(restored.store.projects[0]).toEqual(project);
  expect(restored.recoveryKey).toBeNull();
});

test("corrupt storage is copied to recovery without replacing the original", () => {
  const raw = "{broken-json";
  const storage = memoryStorage({ [PROJECT_STORE_V2_KEY]: raw });
  const result = readProjectStore(storage, () => 12345);
  expect(result.store.projects).toHaveLength(0);
  expect(result.recoveryKey).toBe("lore_bible_saved_projects_recovery_12345");
  expect(storage.getItem(result.recoveryKey!)).toBe(raw);
  expect(storage.getItem(PROJECT_STORE_V2_KEY)).toBe(raw);
});

test("incomplete nested V2 workflow is treated as recoverable corruption", () => {
  const raw = JSON.stringify({
    schemaVersion: 2,
    projects: [{ schemaVersion: 2, document, workflow: {}, generation: {}, savedAt: "2026-01-01" }],
  });
  const parsed = parseProjectStorage(raw);
  expect(parsed.store.projects).toHaveLength(0);
  expect(parsed.recoveryJson).toBe(raw);
});

test("a failed project write preserves the previous stored value", () => {
  const previous = JSON.stringify({ schemaVersion: 2, projects: [] });
  const storage = memoryStorage({ [PROJECT_STORE_V2_KEY]: previous }, true);
  expect(() => writeProjectStore(storage, { schemaVersion: 2, projects: [] })).toThrow("Could not save projects");
  expect(storage.getItem(PROJECT_STORE_V2_KEY)).toBe(previous);
});

test("an unavailable project store returns a warning instead of crashing startup", () => {
  const storage = {
    getItem() { throw new DOMException("Access denied", "SecurityError"); },
    setItem() { throw new DOMException("Access denied", "SecurityError"); },
  };
  const result = readProjectStore(storage);
  expect(result.store.projects).toHaveLength(0);
  expect(result.warning).toContain("unavailable");
});
