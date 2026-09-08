import { expect, test } from "bun:test";
import JSZip from "jszip";
import {
  generateCharacterCardExport,
  generateCharacterCardV3,
  generateCharXBundle,
  generateLorebookExport,
  generateMarkdownExport,
} from "../../src/lib/exportGenerators";

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

test("temporary status remains source-only in runtime exports", () => {
  const input = structuredClone(doc);
  const marker = "TEMP_STATE_SENTINEL_9317";
  input.status.content = marker;
  const before = JSON.stringify(input);
  const card = generateCharacterCardV3(input);

  expect(card.data.system_prompt).toBe("");
  expect(JSON.stringify(card.data.character_book)).not.toContain(marker);
  expect(generateLorebookExport(input)).not.toContain(marker);
  expect(generateCharacterCardExport(input)).not.toContain(marker);
  expect(generateMarkdownExport(input)).toContain(marker);
  expect(JSON.stringify(input)).toBe(before);

  input.omittedSections = ["status"];
  expect(generateLorebookExport(input)).not.toContain(marker);
  expect(JSON.stringify(generateCharacterCardV3(input).data.character_book)).not.toContain(marker);
});

test("explicit runtime instructions and opening survive export", () => {
  const input = structuredClone(doc);
  input.status.content = "TEMP_STATE_SENTINEL_9317";
  input.opening.systemPrompt = "Respect the player's voluntary choices.";
  input.opening.postHistoryInstructions = "Preserve established continuity.";
  input.opening.firstMessage = "The bakery opens for the morning.";
  const card = generateCharacterCardV3(input);

  expect(card.data.system_prompt).toBe(input.opening.systemPrompt);
  expect(card.data.post_history_instructions).toBe(input.opening.postHistoryInstructions);
  expect(card.data.first_mes).toBe(input.opening.firstMessage);
  expect(card.data.character_book.entries.some(
    (entry: { content: string }) => entry.content.includes("The Archive"),
  )).toBe(true);
});

test("CHARX card.json excludes synthetic current-state injection", async () => {
  const input = structuredClone(doc);
  input.status.content = "TEMP_STATE_SENTINEL_9317";
  const blob = await generateCharXBundle(input);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file("card.json");
  expect(file).not.toBeNull();
  const card = JSON.parse(await file!.async("string"));

  expect(card.data.system_prompt).toBe("");
  expect(JSON.stringify(card.data.character_book)).not.toContain("TEMP_STATE_SENTINEL_9317");
  expect(card.spec).toBe("chara_card_v3");
});
