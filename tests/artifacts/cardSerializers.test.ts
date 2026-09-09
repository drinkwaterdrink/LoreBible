import { expect, test } from "bun:test";
import JSZip from "jszip";
import { generateCharacterCardExport, generateCharacterCardV3, generateCharXBundle } from "../../src/lib/exportGenerators";
import type { LoreBibleDocument } from "../../src/types";

const documentFixture = {
  id: "card-serializer-fixture",
  title: "Card World",
  sparkText: "A world with one memorable archive.",
  core: { title: "Card World", pitch: "An archive that remembers visitors.", genreTone: "Quiet mystery", eraScale: "One district", theRule: "Records answer names.", theCost: "Answers leave traces.", theSituation: "The archive opens.", thePressure: "A record is missing.", theQuestion: "Who removed it?" },
  user: { rolePosition: "{{user}} is a visitor.", startsWith: "A library card." },
  conflict: { central: "A record vanished.", opposition: "Conflicting custodians." },
  opening: { firstMessage: "The archive lights wake one row at a time." },
  parse: { registerWords: ["mystery"] }, physics: { density: "Rich" }, status: { content: "CURRENT_SENTINEL" },
  worldPhysics: { rules: [] },
  locations: [{ id: "location-1", fields: { name: "North Archive", function: "Public records" }, keys: ["North Archive"], permanence: "C", locked: false }],
  factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], secrets: [], history: [], pressures: [],
} as unknown as LoreBibleDocument;

test("V2 V3 and CHARX share canonical card fields and lore", async () => {
  const v2 = JSON.parse(generateCharacterCardExport(documentFixture));
  const v3 = generateCharacterCardV3(documentFixture);

  expect(v2.data.name).toBe(v3.data.name);
  expect(v2.data.description).toBe(v3.data.description);
  expect(v2.data.system_prompt).toBe(v3.data.system_prompt);
  expect(v2.data.first_mes).toBe(v3.data.first_mes);
  expect(v2.data.character_book.entries[0].content).toBe(v3.data.character_book.entries[0].content);

  const zip = await JSZip.loadAsync(await (await generateCharXBundle(documentFixture)).arrayBuffer());
  expect(JSON.parse(await zip.file("card.json")!.async("string"))).toEqual(v3);
  const manifest = JSON.parse(await zip.file("lorebible-compilation.json")!.async("string"));
  expect(manifest.evidence_status).toBe("static_validated");
  expect(manifest.runtime_verified).toBe(false);
  expect(manifest.portable_omissions.length).toBeGreaterThan(0);
});
