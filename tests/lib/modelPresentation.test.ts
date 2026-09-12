import { expect, test } from "bun:test";
import { filterAndSortModels, readFavoriteModelIds, toggleFavoriteModel } from "../../src/lib/modelPresentation";

const models = [
  { id: "z/model", label: "Zulu", reasoning: "optional" as const, available: true, created: 100, popularRank: 1, subscriptionIncluded: false },
  { id: "a/model", label: "Alpha", reasoning: "optional" as const, available: true, created: 300, popularRank: 3, subscriptionIncluded: true },
  { id: "m/model", label: "Mike", reasoning: "required" as const, available: true, created: 200, popularRank: 2, subscriptionIncluded: true },
];

test("sorts models alphabetically, newest, popular, and subscription-first while favorites stay first", () => {
  expect(filterAndSortModels(models, { sort: "alphabetical", favorites: ["m/model"], subscriptionOnly: false }).map((m) => m.id)).toEqual(["m/model", "a/model", "z/model"]);
  expect(filterAndSortModels(models, { sort: "newest", favorites: [], subscriptionOnly: false }).map((m) => m.id)).toEqual(["a/model", "m/model", "z/model"]);
  expect(filterAndSortModels(models, { sort: "popular", favorites: [], subscriptionOnly: false }).map((m) => m.id)).toEqual(["z/model", "m/model", "a/model"]);
  expect(filterAndSortModels(models, { sort: "subscription", favorites: [], subscriptionOnly: false }).map((m) => m.id)).toEqual(["a/model", "m/model", "z/model"]);
  expect(filterAndSortModels(models, { sort: "alphabetical", favorites: [], subscriptionOnly: true }).map((m) => m.id)).toEqual(["a/model", "m/model"]);
});

test("favorite storage parsing is closed and toggling is deterministic", () => {
  expect(readFavoriteModelIds('["a/model",42,"a/model","bad\\nmodel"]')).toEqual(["a/model"]);
  expect(toggleFavoriteModel(["a/model"], "m/model")).toEqual(["a/model", "m/model"]);
  expect(toggleFavoriteModel(["a/model", "m/model"], "a/model")).toEqual(["m/model"]);
});
