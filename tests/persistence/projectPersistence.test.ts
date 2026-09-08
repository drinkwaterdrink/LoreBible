import { expect, test } from "bun:test";
import { createSavedProjectV2, parseProjectStorage, removeProjectFromStore, saveProjectToStore } from "../../src/lib/projectPersistence";

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
