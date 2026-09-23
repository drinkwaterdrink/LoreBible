import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { AdventureRefineWorkspace } from "../../src/ui/adventure/workspaces/AdventureRefineWorkspace";
import type { LoreBibleDocument, GenerationSettings } from "../../src/types";

const documentFixture: LoreBibleDocument = {
  id: "refine-adv-doc-1",
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
        role: "Chief Furnace Stoker",
        truth: "Chief stoker secretly allied with the lower wards.",
      },
      permanence: "P",
      locked: true,
    },
    {
      id: "npc-2",
      keys: ["kira", "curator"],
      fields: {
        name: "Kira the Archivist",
        role: "Keeper of Blueprints",
        truth: "Holds the original thermal schematics.",
      },
      permanence: "P",
      locked: false,
    },
  ],
  relationshipWeb: [
    {
      id: "rel-1",
      fields: {
        source: "Varan the Stoker",
        target: "Kira the Archivist",
        bond: "Pragmatic mutual reliance",
        pressure: "Both need unlogged access to valve 4.",
      },
      permanence: "C",
      locked: false,
      keys: ["rel"],
    },
  ],
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

test("AdventureRefineWorkspace renders living Manuscript presentation mode with rich parchment sections", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
    />
  );

  // Verifies header & stage identity
  expect(html).toContain("Stage 05 · Refine Studio");
  expect(html).toContain("The Iron Sanctum");

  // Verifies 4 presentation mode tabs
  expect(html).toContain("Manuscript");
  expect(html).toContain("World Cards");
  expect(html).toContain("Relationships");
  expect(html).toContain("Consistency QA");

  // Verifies Manuscript living sections
  expect(html).toContain("Core Scenario Foundations");
  expect(html).toContain("Protagonist Hierarchy &amp; Position");
  expect(html).toContain("Locations &amp; Thresholds");
  expect(html).toContain("Factions &amp; Sovereign Orders");
  expect(html).toContain("Dramatis Personae");
  expect(html).toContain("Relics &amp; Latent Secrets");
  expect(html).toContain("Narrative Opening &amp; First Choice");

  // Verifies entries in manuscript
  expect(html).toContain("Central Hearth");
  expect(html).toContain("Furnace Guild");
  expect(html).toContain("Varan the Stoker");
  expect(html).toContain("Master Brass Key");
  expect(html).toContain("Frost creeps across the iron gauge.");
});

test("AdventureRefineWorkspace renders Contents drawer button and export action", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
    />
  );

  expect(html).toContain("Contents");
  expect(html).toContain("Export");
  expect(html).toContain("Undo");
  expect(html).toContain("Redo");
});

test("AdventureRefineWorkspace renders World Cards compendium mode with category filter chips", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
      initialPresentationMode="WORLD"
    />
  );

  expect(html).toContain("All Entries");
  expect(html).toContain("Locations");
  expect(html).toContain("Factions");
  expect(html).toContain("Characters");
  expect(html).toContain("Relics &amp; Items");
  expect(html).toContain("Central Hearth");
  expect(html).toContain("Furnace Guild");
  expect(html).toContain("Varan the Stoker");
  expect(html).toContain("Inspect →");
});

test("AdventureRefineWorkspace renders Relationships mode with cast bond summaries and graph modal trigger", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
      initialPresentationMode="RELATIONSHIPS"
    />
  );

  expect(html).toContain("Social Fabric &amp; Cast Bonds");
  expect(html).toContain("Open Interactive Graph Modal");
  expect(html).toContain("Varan the Stoker");
  expect(html).toContain("Kira the Archivist");
  expect(html).toContain("Pressure:");
  expect(html).toContain("Both need unlogged access to valve 4.");
});

test("AdventureRefineWorkspace renders Consistency QA mode with audit trigger and findings status", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
      initialPresentationMode="QA"
    />
  );

  expect(html).toContain("Proofreader &amp; Consistency Studio");
  expect(html).toContain("Run Consistency Audit");
});

test("AdventureRefineWorkspace renders Contextual Entry Dock when an entry is selected", () => {
  const html = renderToString(
    <AdventureRefineWorkspace
      document={documentFixture}
      onUpdateDocument={() => {}}
      onOpenExport={() => {}}
      settings={testSettings}
      onOpenConnections={() => {}}
      initialSelectedSectionKey="npcs"
      initialSelectedEntryId="npc-1"
    />
  );

  // Region and label
  expect(html).toContain('aria-label="Contextual Entry Actions"');
  expect(html).toContain("Varan the Stoker");
  expect(html).toContain("npcs");

  // Quick action controls
  expect(html).toContain("Reroll");
  expect(html).toContain("More");
});

