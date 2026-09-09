import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ExportDrawer } from "../../src/components/ExportDrawer";

const documentFixture = {
  id: "drawer-fixture", title: "Drawer World", sparkText: "A premise.",
  core: { title: "Drawer World", pitch: "A premise.", genreTone: "", eraScale: "", theRule: "", theCost: "", theSituation: "", thePressure: "", theQuestion: "", permanence: "P" },
  user: { rolePosition: "", startsWith: "", wants: "", fears: "", hookPull: "", hookPush: "", hookTrap: "", permanence: "P" },
  worldPhysics: { rules: [], authorityCheck: "", powerCeiling: "", faultLines: [], permanence: "C" },
  status: { content: "", settings: "", permanence: "P" },
  locations: [], factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], secrets: [], history: [], pressures: [], proceduralRolls: [],
  conflict: { central: "", opposition: "", stakesBad: "", stakesAcceptable: "", clock: "", moralKnot: "", theYield: "", speedBumps: [], permanence: "P" },
  pressureProtocol: "", parse: { franchise: null, nonNegotiables: [], registerWords: [], userRole: null, openNegotiables: [] },
  canon: { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" },
  physics: { density: "Standard", strangeness: 3, mundanity: 3, violence: "None", horror: "", romance: "None", humor: "", pacing: "Measured", explicitContent: "No", playerDeath: "No", linguisticBase: "", mustInclude: "", mustAvoid: "" },
  aesthetic: { colors: [], sounds: [], smells: [], weather: "", visualMotifs: [], fashion: "", touchstones: [], permanence: "C" },
  naming: { linguisticBase: "", commonNames: [], eliteNames: [], placeNamePattern: "", permanence: "C" },
  opening: { firstLocation: "", firstNpc: "", firstChoice: "", style: "", firstMessage: "", permanence: "T" },
  expansionNotes: { explicit: "No", violence: "", horror: "", romance: "", humor: "", pacing: "", playerDeath: "", contentFlags: [], allCharactersAdult: true, permanence: "P" },
  antiGravity: { temptations: [], permanence: "P" },
  buildNotes: { permanenceRouting: "", orderBands: "", disabledUntilEarnedList: [], formatMatch: "", permanence: "P" },
} as any;

test("labels native and portable lore exports separately", () => {
  const html = renderToString(<ExportDrawer isOpen onClose={() => undefined} document={documentFixture} />);
  expect(html).toContain("Lumiverse World Book");
  expect(html).toContain("Portable Lorebook");
});
