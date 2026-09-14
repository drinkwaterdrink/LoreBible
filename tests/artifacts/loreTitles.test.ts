import { expect, test } from "bun:test";
import { formatLoreEntryTitle } from "../../src/lib/artifacts/loreTitles";

test("formats standard and custom categories once", () => {
  expect(formatLoreEntryTitle({ categoryId: "character", categoryLabel: "NPC", candidateName: "Barnaby Fitch", content: "Profile", ordinal: 1 })).toMatchObject({ title: "[NPC] Barnaby Fitch", semanticName: "Barnaby Fitch" });
  expect(formatLoreEntryTitle({ categoryId: "character", categoryLabel: "NPC", candidateName: "[NPC] Barnaby Fitch", content: "Profile", ordinal: 1 }).title).toBe("[NPC] Barnaby Fitch");
  expect(formatLoreEntryTitle({ categoryId: "custom:shops", categoryLabel: "Neighborhood Shops", candidateName: "Morrow Market", content: "Profile", ordinal: 1 }).title).toBe("[NEIGHBORHOOD SHOPS] Morrow Market");
});

test("uses a stable short fallback instead of content-derived or paragraph titles", () => {
  const content = "This is a very long lore paragraph that should never become the private title shown in Lumiverse because it is runtime content.";
  const result = formatLoreEntryTitle({ categoryId: "secret", categoryLabel: "Secret", candidateName: content, content, ordinal: 3 });
  expect(result).toMatchObject({ finding: { severity: "major", code: "lore.title_fallback" } });
  expect(result.title).not.toMatch(/Secret \d+$/);
  expect(result.title.length).toBeLessThan(80);
});

test("sanitizes bracket and control-character hazards without changing identity", () => {
  expect(formatLoreEntryTitle({ categoryId: "location", categoryLabel: "[Location]\n", candidateName: "[SECRET] Salt-Gate\u0000 Turnstiles", content: "Place", ordinal: 2 }).title).toBe("[LOCATION] Salt-Gate Turnstiles");
});
