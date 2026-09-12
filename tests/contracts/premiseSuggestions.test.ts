import { expect, test } from "bun:test";
import { parsePremiseSuggestionSet } from "../../src/contracts/premiseSuggestions";

const suggestion = (id: string, premise = `Premise ${id}`) => ({
  id,
  title: `Title ${id}`,
  premise,
  category: "Original",
});

test("accepts exactly four distinct premise suggestions", () => {
  const result = parsePremiseSuggestionSet({
    schemaVersion: 1,
    suggestions: [suggestion("a"), suggestion("b"), suggestion("c"), suggestion("d")],
  });

  expect(result.suggestions.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
});

test("rejects incomplete and repeated premise suggestions", () => {
  expect(() => parsePremiseSuggestionSet({
    schemaVersion: 1,
    suggestions: [suggestion("a")],
  })).toThrow("exactly four");

  expect(() => parsePremiseSuggestionSet({
    schemaVersion: 1,
    suggestions: [
      suggestion("a", "Repeated premise"),
      suggestion("b", " repeated   premise "),
      suggestion("c"),
      suggestion("d"),
    ],
  })).toThrow("unique premises");
});

test("rejects blank fields instead of authoring fallback content", () => {
  expect(() => parsePremiseSuggestionSet({
    schemaVersion: 1,
    suggestions: [suggestion("a"), suggestion("b"), suggestion("c"), { ...suggestion("d"), title: " " }],
  })).toThrow("title");
});
