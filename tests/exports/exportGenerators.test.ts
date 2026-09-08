import { expect, test } from "bun:test";
import { generateCharacterCardV3, generateMarkdownExport } from "../../src/lib/exportGenerators";

const doc = {
  core: { title: "Export Test", pitch: "Pitch", genreTone: "", eraScale: "", theRule: "", theCost: "", theSituation: "", thePressure: "", theQuestion: "", permanence: "P" },
  sparkText: "A premise",
  user: { rolePosition: "{{user}}", startsWith: "", wants: "", fears: "", hookPull: "", hookPush: "", hookTrap: "", permanence: "P" },
  worldPhysics: { rules: [], authorityCheck: "", powerCeiling: "", faultLines: [], permanence: "C" },
  status: { content: "", settings: "", permanence: "P" },
  locations: [{ id: "loc-1", fields: { name: "The Archive", function: "", mood: "", whatsWrong: "" }, keys: ["archive"], permanence: "C", locked: false }],
  factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], secrets: [], pressures: [], history: [], proceduralRolls: [],
  conflict: { central: "", opposition: "", stakesBad: "", stakesAcceptable: "", clock: "", moralKnot: "", theYield: "", speedBumps: [], permanence: "P" },
  pressureProtocol: "",
  aesthetic: { colors: [], sounds: [], smells: [], weather: "", visualMotifs: [], fashion: "", touchstones: [], permanence: "C" },
  naming: { linguisticBase: "", commonNames: [], eliteNames: [], placeNamePattern: "", permanence: "C" },
  canon: { enabled: false, franchiseName: null, fidelity: "Adjacent", explanation: "" },
  physics: { density: "Standard", strangeness: 3, mundanity: 4, violence: "Moderate", horror: "", romance: "", humor: "", pacing: "Measured", explicitContent: "Fade", playerDeath: "Only if earned", linguisticBase: "", mustInclude: "", mustAvoid: "" },
  parse: { franchise: null, nonNegotiables: [], registerWords: [], userRole: null, openNegotiables: [] },
  opening: { firstLocation: "", firstNpc: "", firstChoice: "", style: "", firstMessage: "", permanence: "T" },
  expansionNotes: { explicit: "No", violence: "", horror: "", romance: "", humor: "", pacing: "", playerDeath: "", contentFlags: [], allCharactersAdult: true, permanence: "P" },
  antiGravity: { temptations: [], permanence: "P" }, buildNotes: { permanenceRouting: "", orderBands: "", disabledUntilEarnedList: [], formatMatch: "", permanence: "P" },
} as any;

test("markdown export emits the location section once", () => {
  const markdown = generateMarkdownExport(doc);
  expect(markdown.match(/## 5\. LOCATION SEEDS/g)?.length).toBe(1);
});

test("Character Card V3 includes required extension containers", () => {
  const card = generateCharacterCardV3(doc);
  expect(card.data.extensions).toEqual({});
  expect(card.data.group_only_greetings).toEqual([]);
  expect(card.data.character_book.extensions).toEqual({});
  expect(card.data.character_book.entries.every((entry: { extensions?: unknown }) => entry.extensions && typeof entry.extensions === "object")).toBe(true);
});
