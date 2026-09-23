import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { RefineStage } from "../../src/components/RefineStage";
import { useRefineController, RefineController } from "../../src/hooks/useRefineController";
import type { LoreBibleDocument, GenerationSettings } from "../../src/types";

const documentFixture: LoreBibleDocument = {
  id: "refine-test-doc-1",
  title: "The Iron Sanctum",
  sparkText: "A fortress deep in the permafrost.",
  createdAt: "2026-09-22T00:00:00Z",
  updatedAt: "2026-09-22T00:00:00Z",
  core: {
    title: "The Iron Sanctum",
    pitch: "A fortress deep in the permafrost holding ancient heat.",
    genreTone: "Frostpunk mystery",
    eraScale: "Age of Rust",
    theRule: "Cold consumes flesh; heat consumes coal.",
    theCost: "To survive, you surrender freedom.",
    theSituation: "The last geothermal furnace is failing.",
    thePressure: "Sub-zero blizzard approaching in 3 days.",
    theQuestion: "Will the enclave freeze or ignite the forbidden core?",
    userRole: "Boiler Engineer",
    openingCrawl: "Steam condenses against rusted iron hulls...",
    synopsis: "An isolated underground bunker contends with dwindling coal.",
    logline: "Survive the creeping cold inside an ancient geothermal facility.",
    permanence: "P",
  },
  user: {
    rolePosition: "Boiler Warden",
    startsWith: "A brass wrench and an encrypted valve key",
    wants: "Keep the reactor alive without venting lower wards",
    fears: "Being sealed out in the frost corridor",
    hookPull: "The heat meter drops one psi every hour",
    hookPush: "The Elders demand cold-ward evictions",
    hookTrap: "The spare valves are welded shut",
    permanence: "P",
  },
  worldPhysics: {
    rules: [
      {
        id: "rule-1",
        keys: ["steam", "conduits"],
        fields: {
          rule: "Heat radiates through pressurized bronze conduits.",
        },
        permanence: "C",
        locked: false,
      },
    ],
    authorityCheck: "The Furnace Guild holds exclusive valve authority.",
    powerCeiling: "Steam pressure cannot exceed 120 bar without rupture.",
    faultLines: ["The Lower District freezes if Upper District boosts flow."],
    mundanityAnchors: "Boiled grease broth and ration biscuits.",
    strangenessRationale: "A subterranean biome warmed by anomalous geothermal venting.",
    permanence: "C",
  },
  status: { content: "Complete", settings: "", permanence: "P" },
  locations: [
    {
      id: "loc-1",
      keys: ["furnace", "core"],
      fields: {
        name: "Central Hearth",
        truth: "The beating thermal heart of the mountain bunker.",
        atmosphere: "Choking brass vapor and deafening piston rhythms.",
      },
      permanence: "P",
      locked: false,
    },
  ],
  factions: [
    {
      id: "fac-1",
      keys: ["furnace-guild"],
      fields: {
        name: "Furnace Guild",
        truth: "Engineers who ration life and warmth.",
      },
      permanence: "P",
      locked: false,
    },
  ],
  npcs: [
    {
      id: "npc-1",
      keys: ["varan", "stoker"],
      fields: {
        name: "Varan the Stoker",
        truth: "Chief stoker secretly allied with the lower wards.",
      },
      permanence: "P",
      locked: false,
    },
  ],
  relationshipWeb: [],
  knowledgeMap: [],
  items: [
    {
      id: "item-1",
      keys: ["valve-key"],
      fields: {
        name: "Master Brass Key",
        truth: "Opens bypass valve 4 in the Central Hearth.",
      },
      permanence: "P",
      locked: false,
    },
  ],
  secrets: [],
  history: [],
  pressures: [],
  proceduralRolls: [],
  rulesOfEngagement: [],
  sensoryPalette: [],
  openLoops: [],
  conflict: {
    central: "The geothermal reserve is draining.",
    opposition: "Guild Elders hoarding steam in Upper Haven.",
    stakesBad: "The mountain locks into permanent frost.",
    stakesAcceptable: "Shared rationing until summer.",
    clock: "72 hours until pressure drops below critical.",
    moralKnot: "Vent the miners or freeze the nursery.",
    theYield: "Access to the forgotten sub-ventilation tunnels.",
    speedBumps: ["Broken safety regulator on valve 3."],
    permanence: "P",
  },
  pressureProtocol: "Tiered steam shutdowns across five sectors.",
  parse: { franchise: null, nonNegotiables: [], registerWords: [], userRole: null, openNegotiables: [] },
  canon: { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" },
  physics: {
    density: "Standard",
    strangeness: 3,
    mundanity: 4,
    violence: "Moderate",
    horror: "Psychological frostbite",
    romance: "None",
    humor: "Dark sardonic",
    pacing: "Measured",
    explicitContent: "No",
    playerDeath: "Only if earned",
    linguisticBase: "Industrial dialect",
    mustInclude: "Steam gauges",
    mustAvoid: "High magic",
  },
  aesthetic: { colors: ["#2b2b2b", "#d4af37"], sounds: ["Piston hiss"], smells: ["Sulfur steam"], weather: "Blizzard", visualMotifs: ["Gears"], fashion: "Padded wool", touchstones: ["Frostpunk"], permanence: "C" },
  naming: { linguisticBase: "Industrial Nordic", commonNames: ["Varan", "Kira"], eliteNames: ["Arch-Engineer Thorne"], placeNamePattern: "Hearth-N", permanence: "C" },
  opening: { firstLocation: "Central Hearth", firstNpc: "Varan", firstChoice: "Vent line B or bypass regulator", style: "Second Person Present", firstMessage: "Frost creeps across the iron gauge.", permanence: "T" },
  expansionNotes: { explicit: "No", violence: "Moderate", horror: "None", romance: "None", humor: "None", pacing: "Measured", playerDeath: "Only if earned", contentFlags: [], allCharactersAdult: true, permanence: "P" },
  antiGravity: { temptations: [], permanence: "P" },
  buildNotes: { permanenceRouting: "", orderBands: "", disabledUntilEarnedList: [], formatMatch: "", permanence: "P" },
};

const testSettings: GenerationSettings = {
  quality: "Balanced",
  divergenceMode: "Exploratory",
  authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" },
};

test("Classic RefineStage renders successfully using extracted useRefineController", () => {
  const html = renderToString(
    <RefineStage
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
    />
  );

  // Verifies Classic view elements
  expect(html).toContain("The Iron Sanctum");
  expect(html).toContain("Central Hearth");
  expect(html).toContain("Varan the Stoker");
  expect(html).toContain("Furnace Guild");
  expect(html).toContain("Table of Contents");
  expect(html).toContain("Proofreader");
});

test("useRefineController computes live stats and aggregates all entries", () => {
  let capturedController: RefineController | null = null;

  function Harness() {
    capturedController = useRefineController({
      document: documentFixture,
      onUpdateDocument: () => {},
      settings: testSettings,
      enableKeyboardShortcuts: false,
    });
    return null;
  }

  renderToString(<Harness />);

  expect(capturedController).not.toBeNull();
  const ctrl = capturedController!;

  // History state
  expect(ctrl.canUndo).toBe(false);
  expect(ctrl.canRedo).toBe(false);
  expect(ctrl.currentDoc.id).toBe("refine-test-doc-1");

  // Selection defaults
  expect(ctrl.activeSectionId).toBe("core");
  expect(ctrl.selectedEntryId).toBeNull();
  expect(ctrl.selectedSectionKey).toBeNull();

  // All entries aggregation
  expect(ctrl.allEntriesList.length).toBe(4); // 1 location, 1 faction, 1 npc, 1 item
  expect(ctrl.allEntriesList.map((e) => e.entry.id)).toContain("loc-1");
  expect(ctrl.allEntriesList.map((e) => e.entry.id)).toContain("npc-1");

  // Live stats calculation
  expect(ctrl.liveStats.words).toBeGreaterThan(50);
  expect(ctrl.liveStats.tokens).toBeGreaterThan(60);
});

test("useRefineController supports entry selection and derives currentSelectedEntry", () => {
  let capturedController: RefineController | null = null;

  function Harness() {
    capturedController = useRefineController({
      document: documentFixture,
      onUpdateDocument: () => {},
      settings: testSettings,
      enableKeyboardShortcuts: false,
      initialSelectedSectionKey: "locations",
      initialSelectedEntryId: "loc-1",
    });
    return null;
  }

  renderToString(<Harness />);
  const ctrl = capturedController!;

  expect(ctrl.selectedSectionKey).toBe("locations");
  expect(ctrl.selectedEntryId).toBe("loc-1");
  expect(ctrl.currentSelectedEntry).not.toBeNull();
  expect(ctrl.currentSelectedEntry?.fields.name).toBe("Central Hearth");
});

test("useRefineController detects cross-reference ripples when name is mentioned in other entries", () => {
  let capturedController: RefineController | null = null;

  function Harness() {
    capturedController = useRefineController({
      document: documentFixture,
      onUpdateDocument: () => {},
      settings: testSettings,
      enableKeyboardShortcuts: false,
    });
    return null;
  }

  renderToString(<Harness />);
  const ctrl = capturedController!;

  // "Central Hearth" is mentioned in item-1 fields.truth: "Opens bypass valve 4 in the Central Hearth."
  const notice = ctrl.checkRipplesForName("Central Hearth", "loc-1");
  expect(notice).not.toBeNull();
  expect(notice?.sourceName).toBe("Central Hearth");
  expect(notice?.references.length).toBe(1);
  expect(notice?.references[0].entryId).toBe("item-1");

  // Unrelated name returns null
  const noNotice = ctrl.checkRipplesForName("Nonexistent Place", "loc-1");
  expect(noNotice).toBeNull();
});

test("useRefineController entry mutations toggle lock, save note, and delete entry", () => {
  let lastUpdatedDoc: LoreBibleDocument | null = null;
  let capturedController: RefineController | null = null;

  function Harness() {
    capturedController = useRefineController({
      document: documentFixture,
      onUpdateDocument: (doc) => {
        lastUpdatedDoc = doc;
      },
      settings: testSettings,
      enableKeyboardShortcuts: false,
    });
    return null;
  }

  renderToString(<Harness />);
  const ctrl = capturedController!;

  // 1. Toggle Lock
  ctrl.handleToggleLock("locations", "loc-1");
  expect(lastUpdatedDoc).not.toBeNull();
  expect(lastUpdatedDoc?.locations?.find((l) => l.id === "loc-1")?.locked).toBe(true);

  // 2. Save Margin Note
  ctrl.handleSaveMarginNote("npcs", "npc-1", "Needs an apprentice character hook.", false);
  expect(lastUpdatedDoc?.npcs?.find((n) => n.id === "npc-1")?.note).toBe(
    "Needs an apprentice character hook."
  );

  // 3. Duplicate Entry
  ctrl.handleDuplicateEntry("locations", "loc-1");
  expect(lastUpdatedDoc?.locations?.length).toBe(2);
  expect(lastUpdatedDoc?.locations?.[1].fields.name).toContain("(Copy)");

  // 4. Delete Entry
  ctrl.handleDeleteEntry("locations", "loc-1");
  expect(lastUpdatedDoc?.locations?.some((l) => l.id === "loc-1")).toBe(false);
});

test("useRefineController field updates mutate entry and core fields with updated timestamp", () => {
  let lastUpdatedDoc: LoreBibleDocument | null = null;
  let capturedController: RefineController | null = null;

  function Harness() {
    capturedController = useRefineController({
      document: documentFixture,
      onUpdateDocument: (doc) => {
        lastUpdatedDoc = doc;
      },
      settings: testSettings,
      enableKeyboardShortcuts: false,
    });
    return null;
  }

  renderToString(<Harness />);
  const ctrl = capturedController!;

  // Update entry field
  ctrl.handleUpdateEntryField("npcs", "npc-1", "name", "Varan the Sub-Architect");
  expect(lastUpdatedDoc).not.toBeNull();
  expect(lastUpdatedDoc?.npcs?.[0].fields.name).toBe("Varan the Sub-Architect");
  expect(lastUpdatedDoc?.updatedAt).toBeDefined();

  // Update core field
  ctrl.handleUpdateCoreField("title", "The Iron Citadel");
  expect(lastUpdatedDoc?.core.title).toBe("The Iron Citadel");

  // Update user field
  ctrl.handleUpdateUserField("rolePosition", "Lead Core Architect");
  expect(lastUpdatedDoc?.user.rolePosition).toBe("Lead Core Architect");
});

